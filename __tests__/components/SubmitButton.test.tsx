import { render, screen } from '../helpers/render';
import { userEvent } from '@testing-library/react-native';
import { SubmitButton } from '@/components/SubmitButton';

describe('SubmitButton', () => {
  describe('rendering', () => {
    it('renders as a button with its title text visible', () => {
      render(<SubmitButton title="Save" onPress={() => {}} />);

      expect(screen.getByRole('button', { name: 'Save' })).toBeOnTheScreen();
    });

    it('is disabled and hides title text when loading', () => {
      render(<SubmitButton title="Save" onPress={() => {}} loading={true} />);

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      expect(screen.queryByText('Save')).not.toBeOnTheScreen();
    });
  });

  describe('interaction', () => {
    it('calls onPress when pressed', async () => {
      const onPress = jest.fn();
      const user = userEvent.setup();
      render(<SubmitButton title="Save" onPress={onPress} />);

      await user.press(screen.getByRole('button', { name: 'Save' }));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when loading', async () => {
      const onPress = jest.fn();
      const user = userEvent.setup();
      render(<SubmitButton title="Save" onPress={onPress} loading={true} />);

      await user.press(screen.getByRole('button', { name: 'Save' }));

      expect(onPress).not.toHaveBeenCalled();
    });
  });
});
