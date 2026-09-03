import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <AppLogoIcon className="size-8" />
            <div className="ml-2 grid flex-1 text-left text-sm">
                <span
                    className="truncate leading-tight font-semibold"
                    style={{
                        fontFamily:
                            "'Inter Tight', ui-sans-serif, system-ui, sans-serif",
                        letterSpacing: '-0.035em',
                    }}
                >
                    Inbxer
                </span>
            </div>
        </>
    );
}
