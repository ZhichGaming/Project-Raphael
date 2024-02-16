import "../styles/IdleMenu.css";

export default function IdleMenu({ setPageState }: { setPageState: (pageState: string) => void }) {
    return (
        <div>
            <div id="start">Press any key to wake Raphael up</div>
            <canvas id="sun"/>
        </div>
    );
}
