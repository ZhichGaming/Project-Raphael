import "../styles/SettingsMenu.css";

export default function SettingsMenu({ setPageState }: { setPageState: (pageState: string) => void }) {
    return (
        <div>
            <canvas id="sun"/>
        </div>
    );
}
