import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/onboarding/workspace';

type Props = {
    userName: string;
};

export default function OnboardingWorkspace({ userName }: Props) {
    return (
        <>
            <Head title="Name your workspace" />
            <Form
                {...store.form()}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Workspace name</Label>
                            <Input
                                id="name"
                                type="text"
                                required
                                autoFocus
                                autoComplete="off"
                                name="name"
                                placeholder={`${userName}'s Workspace`}
                            />
                            <InputError message={errors.name} />
                        </div>

                        <Button type="submit" className="w-full">
                            {processing && <Spinner />}
                            Create workspace
                        </Button>
                    </div>
                )}
            </Form>
        </>
    );
}

OnboardingWorkspace.layout = {
    title: 'Name your workspace',
    description:
        'This is what your team will see — you can change it later in Settings',
};
