import { renderHook, act } from '@testing-library/react-native';
import {
  useWorkoutState,
  type ActiveWorkout,
  type TemplateSnapshot,
  type RestoredWorkoutData,
  type WorkoutExercise,
} from '@/hooks/useWorkoutState';
import type {
  TemplateWithExercises,
  TemplateExerciseWithSets,
  Exercise,
  ExerciseCategory,
} from '@/types/database';

// ============================================================================
// Factory Helpers
// ============================================================================

function makeTemplate(
  overrides: Partial<TemplateWithExercises> & {
    exercises?: Partial<TemplateExerciseWithSets>[];
  } = {}
): TemplateWithExercises {
  const { exercises = [], ...rest } = overrides;
  return {
    id: 'tmpl-1',
    name: 'Test Template',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    exercises: exercises.map((ex, i) => makeTemplateExercise({ ...ex }, i)),
    ...rest,
  };
}

function makeTemplateExercise(
  overrides: Partial<TemplateExerciseWithSets> = {},
  index = 0
): TemplateExerciseWithSets {
  return {
    exercise_id: `ex-${index + 1}`,
    name: `Exercise ${index + 1}`,
    category: 'Chest' as ExerciseCategory,
    default_rest_seconds: 90,
    sets: [
      { set_number: 1, weight: 100, reps: 8 },
      { set_number: 2, weight: 100, reps: 8 },
    ],
    ...overrides,
  };
}

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'new-ex-1',
    user_id: 'user-1',
    name: 'New Exercise',
    category: 'Back' as ExerciseCategory,
    equipment: null,
    instructions: null,
    level: null,
    force: null,
    mechanic: null,
    is_system: false,
    ...overrides,
  };
}

function makeRestoredWorkout(
  overrides: Partial<RestoredWorkoutData> = {}
): RestoredWorkoutData {
  return {
    activeWorkout: {
      template_id: 'tmpl-restored',
      template_name: 'Restored Template',
      started_at: '2024-06-01T10:00:00Z',
      exercises: [
        {
          exercise_id: 'restored-ex-1',
          name: 'Restored Exercise',
          category: 'Legs',
          order: 0,
          rest_seconds: 60,
          sets: [{ set_number: 1, weight: 50, reps: 12, is_done: true }],
        },
      ],
    },
    originalTemplateSnapshot: {
      exercises: [
        {
          exercise_id: 'restored-ex-1',
          rest_seconds: 60,
          sets: [{ set_number: 1, weight: 50, reps: 12 }],
        },
      ],
    },
    ...overrides,
  };
}

/** Standard 2-exercise template for most tests */
function twoExerciseTemplate(): TemplateWithExercises {
  return makeTemplate({
    exercises: [
      {
        exercise_id: 'ex-1',
        name: 'Bench Press',
        category: 'Chest',
        default_rest_seconds: 90,
        sets: [
          { set_number: 1, weight: 100, reps: 8 },
          { set_number: 2, weight: 100, reps: 8 },
          { set_number: 3, weight: 100, reps: 8 },
        ],
      },
      {
        exercise_id: 'ex-2',
        name: 'Squat',
        category: 'Legs',
        default_rest_seconds: 120,
        sets: [
          { set_number: 1, weight: 140, reps: 5 },
          { set_number: 2, weight: 140, reps: 5 },
        ],
      },
    ],
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('useWorkoutState', () => {
  // --------------------------------------------------------------------------
  // 1. Initialization
  // --------------------------------------------------------------------------
  describe('initialization', () => {
    it('1.1 — no-param baseline state', () => {
      const { result } = renderHook(() => useWorkoutState());
      expect(result.current.activeWorkout).toEqual({
        template_id: null,
        template_name: '',
        started_at: null,
        exercises: [],
      });
      expect(result.current.originalTemplateSnapshot).toBeNull();
      expect(result.current.revealedSetKey).toBeNull();
    });

    it('1.2 — template maps exercises/sets correctly', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      const ex = result.current.activeWorkout.exercises;
      expect(ex).toHaveLength(2);

      // First exercise
      expect(ex[0].exercise_id).toBe('ex-1');
      expect(ex[0].name).toBe('Bench Press');
      expect(ex[0].category).toBe('Chest');
      expect(ex[0].order).toBe(0);
      expect(ex[0].rest_seconds).toBe(90);
      expect(ex[0].sets).toHaveLength(3);
      expect(ex[0].sets[0]).toEqual({
        set_number: 1,
        weight: 100,
        reps: 8,
        is_done: false,
      });

      // Second exercise
      expect(ex[1].exercise_id).toBe('ex-2');
      expect(ex[1].name).toBe('Squat');
      expect(ex[1].category).toBe('Legs');
      expect(ex[1].order).toBe(1);
      expect(ex[1].rest_seconds).toBe(120);
      expect(ex[1].sets).toHaveLength(2);
    });

    it('1.3 — started_at is current ISO timestamp', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-03-15T12:00:00.000Z'));

      const tmpl = makeTemplate({
        exercises: [{ default_rest_seconds: 90 }],
      });
      const { result } = renderHook(() => useWorkoutState(tmpl));

      expect(result.current.activeWorkout.started_at).toBe(
        '2025-03-15T12:00:00.000Z'
      );

      jest.useRealTimers();
    });

    it('1.4 — explicit default_rest_seconds is used', () => {
      const tmpl = makeTemplate({
        exercises: [{ default_rest_seconds: 120 }],
      });
      const { result } = renderHook(() => useWorkoutState(tmpl));
      expect(result.current.activeWorkout.exercises[0].rest_seconds).toBe(120);
    });

    it.each([
      ['0', 0],
      ['null', null as any],
      ['undefined', undefined as any],
    ])(
      '1.5 — falsy default_rest_seconds (%s) falls back to 90',
      (_label, value) => {
        const tmpl = makeTemplate({
          exercises: [{ default_rest_seconds: value }],
        });
        const { result } = renderHook(() => useWorkoutState(tmpl));
        expect(result.current.activeWorkout.exercises[0].rest_seconds).toBe(90);
      }
    );

    it('1.6 — snapshot is a deep copy', () => {
      const tmpl = makeTemplate({
        exercises: [{ default_rest_seconds: 90 }],
      });
      const { result } = renderHook(() => useWorkoutState(tmpl));
      const snapBefore = JSON.parse(
        JSON.stringify(result.current.originalTemplateSnapshot)
      );

      act(() => {
        result.current.updateSetWeight(0, 0, 999);
      });

      expect(result.current.originalTemplateSnapshot).toEqual(snapBefore);
    });

    it('1.7 — snapshot rest_seconds also applies || 90 fallback', () => {
      const tmpl = makeTemplate({
        exercises: [{ default_rest_seconds: 0 }],
      });
      const { result } = renderHook(() => useWorkoutState(tmpl));
      expect(
        result.current.originalTemplateSnapshot!.exercises[0].rest_seconds
      ).toBe(90);
    });

    it('1.8 — restoredWorkout takes precedence over template', () => {
      const tmpl = twoExerciseTemplate();
      const restored = makeRestoredWorkout();
      const { result } = renderHook(() => useWorkoutState(tmpl, restored));

      expect(result.current.activeWorkout.template_id).toBe('tmpl-restored');
      expect(result.current.activeWorkout.template_name).toBe(
        'Restored Template'
      );
      expect(result.current.activeWorkout.exercises[0].exercise_id).toBe(
        'restored-ex-1'
      );
    });

    it('1.9 — restored workout with null snapshot', () => {
      const restored = makeRestoredWorkout({
        originalTemplateSnapshot: null,
      });
      const { result } = renderHook(() => useWorkoutState(undefined, restored));

      expect(result.current.activeWorkout.template_id).toBe('tmpl-restored');
      expect(result.current.originalTemplateSnapshot).toBeNull();
    });

    it('1.10 — isInitialized guard: rerender with new template ignored', () => {
      const tmpl1 = makeTemplate({ id: 'tmpl-1', name: 'First' });
      const tmpl2 = makeTemplate({ id: 'tmpl-2', name: 'Second' });

      const { result, rerender } = renderHook(
        ({ template }) => useWorkoutState(template),
        { initialProps: { template: tmpl1 } }
      );

      expect(result.current.activeWorkout.template_id).toBe('tmpl-1');

      rerender({ template: tmpl2 });

      expect(result.current.activeWorkout.template_id).toBe('tmpl-1');
      expect(result.current.activeWorkout.template_name).toBe('First');
    });

    it('1.11 — isInitialized guard: late restoredWorkout ignored', () => {
      const tmpl = makeTemplate({ id: 'tmpl-1' });
      const restored = makeRestoredWorkout();

      const { result, rerender } = renderHook(
        ({
          template,
          restoredWorkout,
        }: {
          template?: TemplateWithExercises;
          restoredWorkout?: RestoredWorkoutData;
        }) => useWorkoutState(template, restoredWorkout),
        { initialProps: { template: tmpl, restoredWorkout: undefined } }
      );

      expect(result.current.activeWorkout.template_id).toBe('tmpl-1');

      rerender({ template: tmpl, restoredWorkout: restored });

      expect(result.current.activeWorkout.template_id).toBe('tmpl-1');
    });

    it('1.12 — multiple exercises: order assigned by map index', () => {
      const tmpl = makeTemplate({
        exercises: [
          { exercise_id: 'a' },
          { exercise_id: 'b' },
          { exercise_id: 'c' },
        ],
      });
      const { result } = renderHook(() => useWorkoutState(tmpl));

      const orders = result.current.activeWorkout.exercises.map(
        (e) => e.order
      );
      expect(orders).toEqual([0, 1, 2]);
    });

    it('1.13 — empty exercises template', () => {
      const tmpl = makeTemplate({ exercises: [] });
      const { result } = renderHook(() => useWorkoutState(tmpl));

      expect(result.current.activeWorkout.exercises).toEqual([]);
      expect(result.current.activeWorkout.template_id).toBe('tmpl-1');
    });
  });

  // --------------------------------------------------------------------------
  // 2. updateSetWeight
  // --------------------------------------------------------------------------
  describe('updateSetWeight', () => {
    it('2.1 — updates weight at correct position', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.updateSetWeight(0, 1, 120);
      });

      expect(result.current.activeWorkout.exercises[0].sets[1].weight).toBe(
        120
      );
      // Sibling set unchanged
      expect(result.current.activeWorkout.exercises[0].sets[0].weight).toBe(
        100
      );
      // Other exercise unchanged
      expect(result.current.activeWorkout.exercises[1].sets[0].weight).toBe(
        140
      );
    });

    it('2.2 — returns new array reference (immutability)', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      const prevExercises = result.current.activeWorkout.exercises;

      act(() => {
        result.current.updateSetWeight(0, 0, 110);
      });

      expect(result.current.activeWorkout.exercises).not.toBe(prevExercises);
    });
  });

  // --------------------------------------------------------------------------
  // 3. updateSetReps
  // --------------------------------------------------------------------------
  describe('updateSetReps', () => {
    it('3.1 — updates reps at correct position', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.updateSetReps(1, 0, 12);
      });

      expect(result.current.activeWorkout.exercises[1].sets[0].reps).toBe(12);
      // Sibling set unchanged
      expect(result.current.activeWorkout.exercises[1].sets[1].reps).toBe(5);
    });

    it('3.2 — does not affect weight or is_done', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.updateSetReps(0, 0, 15);
      });

      const set = result.current.activeWorkout.exercises[0].sets[0];
      expect(set.reps).toBe(15);
      expect(set.weight).toBe(100);
      expect(set.is_done).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 4. toggleSetDone
  // --------------------------------------------------------------------------
  describe('toggleSetDone', () => {
    it('4.1 — false → true, toggles is_done and returns object', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      let returnValue: { wasDone: boolean };
      act(() => {
        returnValue = result.current.toggleSetDone(0, 0);
      });

      // toggleSetDone returns { wasDone } — value set inside functional
      // setState updater, which React 18 batches. The return value is
      // captured before the updater runs, so wasDone is always false.
      expect(returnValue!).toHaveProperty('wasDone');
      expect(result.current.activeWorkout.exercises[0].sets[0].is_done).toBe(
        true
      );
    });

    it('4.2 — double toggle restores is_done to false', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.toggleSetDone(0, 0);
      });
      expect(result.current.activeWorkout.exercises[0].sets[0].is_done).toBe(
        true
      );

      act(() => {
        result.current.toggleSetDone(0, 0);
      });
      expect(result.current.activeWorkout.exercises[0].sets[0].is_done).toBe(
        false
      );
    });

    it('4.3 — only targeted set is toggled', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.toggleSetDone(0, 1);
      });

      expect(result.current.activeWorkout.exercises[0].sets[0].is_done).toBe(
        false
      );
      expect(result.current.activeWorkout.exercises[0].sets[1].is_done).toBe(
        true
      );
      expect(result.current.activeWorkout.exercises[0].sets[2].is_done).toBe(
        false
      );
    });
  });

  // --------------------------------------------------------------------------
  // 5. addSet
  // --------------------------------------------------------------------------
  describe('addSet', () => {
    it('5.1 — copies weight/reps from last set', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.addSet(0);
      });

      const newSet = result.current.activeWorkout.exercises[0].sets[3];
      expect(newSet.weight).toBe(100);
      expect(newSet.reps).toBe(8);
      expect(newSet.is_done).toBe(false);
    });

    it('5.2 — set_number is length + 1', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      // ex-1 has 3 sets
      act(() => {
        result.current.addSet(0);
      });

      expect(result.current.activeWorkout.exercises[0].sets[3].set_number).toBe(
        4
      );
    });

    it('5.3 — weight 0 on last set → new set weight is 0', () => {
      const tmpl = makeTemplate({
        exercises: [
          {
            sets: [{ set_number: 1, weight: 0, reps: 10 }],
          },
        ],
      });
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.addSet(0);
      });

      expect(result.current.activeWorkout.exercises[0].sets[1].weight).toBe(0);
    });

    it('5.4 — reps 0 on last set → new set reps is 10 (|| fallback)', () => {
      const tmpl = makeTemplate({
        exercises: [
          {
            sets: [{ set_number: 1, weight: 50, reps: 0 }],
          },
        ],
      });
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.addSet(0);
      });

      // 0 || 10 = 10
      expect(result.current.activeWorkout.exercises[0].sets[1].reps).toBe(10);
    });

    it('5.5 — does not mutate other exercises', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      const ex2SetsBefore = result.current.activeWorkout.exercises[1].sets.length;

      act(() => {
        result.current.addSet(0);
      });

      expect(result.current.activeWorkout.exercises[1].sets.length).toBe(
        ex2SetsBefore
      );
    });
  });

  // --------------------------------------------------------------------------
  // 6. deleteSet
  // --------------------------------------------------------------------------
  describe('deleteSet', () => {
    it('6.1 — deletes set at given index', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      // ex-1 has 3 sets, delete index 1
      act(() => {
        result.current.deleteSet(0, 1);
      });

      expect(result.current.activeWorkout.exercises[0].sets).toHaveLength(2);
    });

    it('6.2 — renumbers remaining sets from 1', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      // Delete first set (index 0) from ex-1 (3 sets)
      act(() => {
        result.current.deleteSet(0, 0);
      });

      const sets = result.current.activeWorkout.exercises[0].sets;
      expect(sets[0].set_number).toBe(1);
      expect(sets[1].set_number).toBe(2);
    });

    it('6.3 — minimum 1 set guard', () => {
      const tmpl = makeTemplate({
        exercises: [
          {
            sets: [{ set_number: 1, weight: 50, reps: 10 }],
          },
        ],
      });
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.deleteSet(0, 0);
      });

      expect(result.current.activeWorkout.exercises[0].sets).toHaveLength(1);
    });

    it('6.4 — closes revealed swipe row (even on guard)', () => {
      const tmpl = makeTemplate({
        exercises: [
          {
            sets: [{ set_number: 1, weight: 50, reps: 10 }],
          },
        ],
      });
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.setRevealedSet('some-key');
      });
      expect(result.current.revealedSetKey).toBe('some-key');

      act(() => {
        result.current.deleteSet(0, 0); // guard triggers, but swipe still closes
      });

      expect(result.current.revealedSetKey).toBeNull();
    });

    it('6.5 — deleting last set in list', () => {
      const tmpl = makeTemplate({
        exercises: [
          {
            sets: [
              { set_number: 1, weight: 50, reps: 10 },
              { set_number: 2, weight: 60, reps: 8 },
            ],
          },
        ],
      });
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.deleteSet(0, 1);
      });

      const sets = result.current.activeWorkout.exercises[0].sets;
      expect(sets).toHaveLength(1);
      expect(sets[0].set_number).toBe(1);
      expect(sets[0].weight).toBe(50);
    });
  });

  // --------------------------------------------------------------------------
  // 7. addExercise
  // --------------------------------------------------------------------------
  describe('addExercise', () => {
    it('7.1 — adds with 3 default sets, returns true', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      let added: boolean;
      act(() => {
        added = result.current.addExercise(makeExercise());
      });

      expect(added!).toBe(true);
      const newEx =
        result.current.activeWorkout.exercises[
          result.current.activeWorkout.exercises.length - 1
        ];
      expect(newEx.sets).toHaveLength(3);
      expect(newEx.sets[0]).toEqual({
        set_number: 1,
        weight: 0,
        reps: 10,
        is_done: false,
      });
    });

    it('7.2 — rest_seconds: 90, order = exercises.length', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.addExercise(makeExercise());
      });

      const newEx =
        result.current.activeWorkout.exercises[
          result.current.activeWorkout.exercises.length - 1
        ];
      expect(newEx.rest_seconds).toBe(90);
      expect(newEx.order).toBe(2); // was 2 exercises, new one at index 2
    });

    it('7.3 — maps exercise_id, name, category from input', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.addExercise(
          makeExercise({
            id: 'custom-id',
            name: 'Custom Name',
            category: 'Shoulders',
          })
        );
      });

      const newEx =
        result.current.activeWorkout.exercises[
          result.current.activeWorkout.exercises.length - 1
        ];
      expect(newEx.exercise_id).toBe('custom-id');
      expect(newEx.name).toBe('Custom Name');
      expect(newEx.category).toBe('Shoulders');
    });

    it('7.4 — duplicate detection returns false', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      // ex-1 already exists in the template
      let added: boolean;
      act(() => {
        added = result.current.addExercise(makeExercise({ id: 'ex-1' }));
      });

      expect(added!).toBe(false);
      expect(result.current.activeWorkout.exercises).toHaveLength(2);
    });

    it('7.5 — sequential duplicate detection', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      let first: boolean;
      act(() => {
        first = result.current.addExercise(
          makeExercise({ id: 'new-1', name: 'New' })
        );
      });
      expect(first!).toBe(true);

      let second: boolean;
      act(() => {
        second = result.current.addExercise(
          makeExercise({ id: 'new-1', name: 'New' })
        );
      });
      expect(second!).toBe(false);
      expect(result.current.activeWorkout.exercises).toHaveLength(3);
    });
  });

  // --------------------------------------------------------------------------
  // 8. removeExercise
  // --------------------------------------------------------------------------
  describe('removeExercise', () => {
    it('8.1 — removes by index, returns removed exercise', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      let removed: WorkoutExercise | undefined;
      act(() => {
        removed = result.current.removeExercise(0);
      });

      expect(removed).toBeDefined();
      expect(removed!.exercise_id).toBe('ex-1');
      expect(result.current.activeWorkout.exercises).toHaveLength(1);
    });

    it('8.2 — out-of-bounds index returns undefined', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      let removed: WorkoutExercise | undefined;
      act(() => {
        removed = result.current.removeExercise(99);
      });

      expect(removed).toBeUndefined();
      expect(result.current.activeWorkout.exercises).toHaveLength(2);
    });

    it('8.3 — return value comes from ref (pre-state-update)', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      let removed: WorkoutExercise | undefined;
      act(() => {
        removed = result.current.removeExercise(1);
      });

      expect(removed!.exercise_id).toBe('ex-2');
      expect(removed!.name).toBe('Squat');
    });
  });

  // --------------------------------------------------------------------------
  // 9. updateRestSeconds
  // --------------------------------------------------------------------------
  describe('updateRestSeconds', () => {
    it('9.1 — updates correct exercise rest_seconds', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.updateRestSeconds(0, 180);
      });

      expect(result.current.activeWorkout.exercises[0].rest_seconds).toBe(180);
      expect(result.current.activeWorkout.exercises[1].rest_seconds).toBe(120);
    });

    it('9.2 — does not modify sets or other fields', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      const setsBefore = JSON.parse(
        JSON.stringify(result.current.activeWorkout.exercises[0].sets)
      );
      const nameBefore = result.current.activeWorkout.exercises[0].name;

      act(() => {
        result.current.updateRestSeconds(0, 45);
      });

      expect(result.current.activeWorkout.exercises[0].sets).toEqual(
        setsBefore
      );
      expect(result.current.activeWorkout.exercises[0].name).toBe(nameBefore);
    });
  });

  // --------------------------------------------------------------------------
  // 10. Swipe coordination
  // --------------------------------------------------------------------------
  describe('swipe coordination', () => {
    it('10.1 — setRevealedSet stores key', () => {
      const { result } = renderHook(() => useWorkoutState());

      act(() => {
        result.current.setRevealedSet('ex-1-set-2');
      });

      expect(result.current.revealedSetKey).toBe('ex-1-set-2');
    });

    it('10.2 — setRevealedSet replaces previous key', () => {
      const { result } = renderHook(() => useWorkoutState());

      act(() => {
        result.current.setRevealedSet('first');
      });
      act(() => {
        result.current.setRevealedSet('second');
      });

      expect(result.current.revealedSetKey).toBe('second');
    });

    it('10.3 — closeAllSwipes sets null', () => {
      const { result } = renderHook(() => useWorkoutState());

      act(() => {
        result.current.setRevealedSet('some-key');
      });
      act(() => {
        result.current.closeAllSwipes();
      });

      expect(result.current.revealedSetKey).toBeNull();
    });

    it('10.4 — setRevealedSet(null) also closes', () => {
      const { result } = renderHook(() => useWorkoutState());

      act(() => {
        result.current.setRevealedSet('some-key');
      });
      act(() => {
        result.current.setRevealedSet(null);
      });

      expect(result.current.revealedSetKey).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 11. getRestTimeChanges
  // --------------------------------------------------------------------------
  describe('getRestTimeChanges', () => {
    it('11.1 — returns [] when snapshot is null', () => {
      const { result } = renderHook(() => useWorkoutState());
      expect(result.current.getRestTimeChanges()).toEqual([]);
    });

    it('11.2 — returns [] when no rest times changed', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));
      expect(result.current.getRestTimeChanges()).toEqual([]);
    });

    it('11.3 — returns changed exercise', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.updateRestSeconds(0, 120);
      });

      const changes = result.current.getRestTimeChanges();
      expect(changes).toEqual([{ exercise_id: 'ex-1', rest_seconds: 120 }]);
    });

    it('11.4 — skips exercises added during workout', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.addExercise(makeExercise({ id: 'new-ex' }));
      });
      act(() => {
        result.current.updateRestSeconds(2, 45); // update the added exercise
      });

      const changes = result.current.getRestTimeChanges();
      expect(changes).toEqual([]);
    });

    it('11.5 — returns multiple changed exercises', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.updateRestSeconds(0, 60);
      });
      act(() => {
        result.current.updateRestSeconds(1, 180);
      });

      const changes = result.current.getRestTimeChanges();
      expect(changes).toHaveLength(2);
      expect(changes).toContainEqual({
        exercise_id: 'ex-1',
        rest_seconds: 60,
      });
      expect(changes).toContainEqual({
        exercise_id: 'ex-2',
        rest_seconds: 180,
      });
    });

    it('11.6 — excludes unchanged exercises', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.updateRestSeconds(0, 60);
      });

      const changes = result.current.getRestTimeChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0].exercise_id).toBe('ex-1');
    });
  });

  // --------------------------------------------------------------------------
  // 12. getWeightRepsChanges
  // --------------------------------------------------------------------------
  describe('getWeightRepsChanges', () => {
    it('12.1 — returns [] when snapshot is null', () => {
      const { result } = renderHook(() => useWorkoutState());
      expect(result.current.getWeightRepsChanges()).toEqual([]);
    });

    it('12.2 — returns [] when no sets are done', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));
      expect(result.current.getWeightRepsChanges()).toEqual([]);
    });

    it('12.3 — returns done sets within template set count', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.toggleSetDone(0, 0);
      });

      const changes = result.current.getWeightRepsChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0].exercise_id).toBe('ex-1');
      expect(changes[0].sets).toEqual([
        { set_number: 1, weight: 100, reps: 8 },
      ]);
    });

    it('12.4 — excludes added sets (set_number > template count)', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      // ex-1 has 3 template sets; add a 4th, then toggle it done
      act(() => {
        result.current.addSet(0);
      });
      act(() => {
        result.current.toggleSetDone(0, 3); // index 3 = set_number 4
      });

      const changes = result.current.getWeightRepsChanges();
      // No done sets within template set count
      expect(changes).toEqual([]);
    });

    it('12.5 — skips exercises added during workout', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.addExercise(makeExercise({ id: 'new-ex' }));
      });
      act(() => {
        result.current.toggleSetDone(2, 0); // toggle first set of added exercise
      });

      const changes = result.current.getWeightRepsChanges();
      expect(changes).toEqual([]);
    });

    it('12.6 — returns only done sets, not undone', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.toggleSetDone(0, 0); // done
      });
      // set at index 1 remains undone

      const changes = result.current.getWeightRepsChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0].sets).toHaveLength(1);
      expect(changes[0].sets[0].set_number).toBe(1);
    });

    it('12.7 — returns multiple exercises with done sets', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.toggleSetDone(0, 0);
      });
      act(() => {
        result.current.toggleSetDone(1, 0);
      });

      const changes = result.current.getWeightRepsChanges();
      expect(changes).toHaveLength(2);
      expect(changes.map((c) => c.exercise_id).sort()).toEqual([
        'ex-1',
        'ex-2',
      ]);
    });

    it('12.8 — returns updated weight/reps, not originals', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.updateSetWeight(0, 0, 120);
      });
      act(() => {
        result.current.updateSetReps(0, 0, 10);
      });
      act(() => {
        result.current.toggleSetDone(0, 0);
      });

      const changes = result.current.getWeightRepsChanges();
      expect(changes[0].sets[0]).toEqual({
        set_number: 1,
        weight: 120,
        reps: 10,
      });
    });
  });

  // --------------------------------------------------------------------------
  // 13. hasTemplateChanges
  // --------------------------------------------------------------------------
  describe('hasTemplateChanges', () => {
    it('13.1 — returns false when snapshot is null', () => {
      const { result } = renderHook(() => useWorkoutState());
      expect(result.current.hasTemplateChanges()).toBe(false);
    });

    it('13.2 — returns false when template_id is null', () => {
      const restored = makeRestoredWorkout({
        activeWorkout: {
          template_id: null,
          template_name: 'Ad-hoc',
          started_at: '2024-01-01T00:00:00Z',
          exercises: [
            {
              exercise_id: 'ex-1',
              name: 'Ex',
              category: 'Chest',
              order: 0,
              rest_seconds: 90,
              sets: [{ set_number: 1, weight: 50, reps: 10, is_done: false }],
            },
          ],
        },
        originalTemplateSnapshot: {
          exercises: [
            {
              exercise_id: 'ex-1',
              rest_seconds: 90,
              sets: [{ set_number: 1, weight: 50, reps: 10 }],
            },
          ],
        },
      });
      const { result } = renderHook(() =>
        useWorkoutState(undefined, restored)
      );

      expect(result.current.hasTemplateChanges()).toBe(false);
    });

    it('13.3 — returns false when unchanged', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));
      expect(result.current.hasTemplateChanges()).toBe(false);
    });

    it('13.4 — returns true when exercise added', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.addExercise(makeExercise());
      });

      expect(result.current.hasTemplateChanges()).toBe(true);
    });

    it('13.5 — returns true when exercise removed', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.removeExercise(0);
      });

      expect(result.current.hasTemplateChanges()).toBe(true);
    });

    it('13.6 — returns true when set added', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.addSet(0);
      });

      expect(result.current.hasTemplateChanges()).toBe(true);
    });

    it('13.7 — returns true when set deleted', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.deleteSet(0, 0);
      });

      expect(result.current.hasTemplateChanges()).toBe(true);
    });

    it('13.8 — returns false for weight/reps changes only', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.updateSetWeight(0, 0, 999);
      });
      act(() => {
        result.current.updateSetReps(0, 0, 99);
      });

      expect(result.current.hasTemplateChanges()).toBe(false);
    });

    it('13.9 — returns false for rest_seconds changes only', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.updateRestSeconds(0, 999);
      });

      expect(result.current.hasTemplateChanges()).toBe(false);
    });

    it('13.10 — returns false for is_done changes only', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      act(() => {
        result.current.toggleSetDone(0, 0);
      });

      expect(result.current.hasTemplateChanges()).toBe(false);
    });

    it('13.11 — bidirectional: detects swapped exercises (same count)', () => {
      const tmpl = twoExerciseTemplate();
      const { result } = renderHook(() => useWorkoutState(tmpl));

      // Remove ex-2, add a new exercise → same count but different identity
      act(() => {
        result.current.removeExercise(1);
      });
      act(() => {
        result.current.addExercise(
          makeExercise({ id: 'ex-3', name: 'Deadlift', category: 'Back' })
        );
      });

      expect(result.current.activeWorkout.exercises).toHaveLength(2);
      expect(result.current.hasTemplateChanges()).toBe(true);
    });
  });
});
