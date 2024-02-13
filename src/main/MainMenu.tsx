import { useState } from 'react';
import DefaultMenu from './DefaultMenu';
import ChatMenu from './ChatMenu';
import SettingsMenu from './SettingsMenu';

export default function MainMenu() {
    // Values: default, chat, settings
    let [pageState, setPageState] = useState("default");

    if (pageState === "default") {
        return <DefaultMenu setPageState={setPageState}/>
    } else if (pageState === "chat") {
        return <ChatMenu setPageState={setPageState}/>
    } else if (pageState === "settings") {
        return <SettingsMenu setPageState={setPageState}/>
    }

    // This is a fallback in case the state is invalid.
    return (
        <DefaultMenu setPageState={setPageState}/>
    )
}