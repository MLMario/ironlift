import { render, screen } from '../helpers/render';
import { SubmitButton } from '@/components/SubmitButton';

describe('SubmitButton', () => {
  it('renders with its title text visible', () => {
    render(<SubmitButton title="Save" onPress={() => {}} />);

    expect(screen.getByText('Save')).toBeOnTheScreen();
  });

  it('shows ActivityIndicator instead of text when loading', () => {
    render(<SubmitButton title="Save" onPress={() => {}} loading={true} />);

    expect(screen.queryByText('Save')).not.toBeOnTheScreen();
  });
});
