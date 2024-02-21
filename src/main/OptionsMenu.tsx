import "../styles/OptionsMenu.css";

export default function OptionsMenu({ setPageState }: { setPageState: (pageState: string) => void }) {
    return (
        <div>
            <div id="menu">
                <div id="settings" className="options"> Settings </div>
                <div id="compact" className="options"> Compact Mode </div>
                <div id="exit" className="options"> Exit </div>
            </div>
            <canvas id="sun"/>
        </div>
    );
}
