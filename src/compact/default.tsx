import "../styles/compact.css";
import { invoke } from '@tauri-apps/api/tauri'

export default function Default() {
    return (
        <div id="test">
            <div id="box"></div>
        </div>
    );
}