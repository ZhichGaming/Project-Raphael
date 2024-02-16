import { useState } from 'react';
import ChatMenu from './ChatMenu';
import OptionsMenu from './OptionsMenu';
import IdleMenu from './IdleMenu';
import SettingsMenu from './SettingsMenu';

export default function DefaultMenu() {
    // Values: default, chat, settings
    let [pageState, setPageState] = useState("idle");

    if (pageState === "chat") {
        return <ChatMenu setPageState={setPageState}/>
    } else if (pageState === "options") {
        return <OptionsMenu setPageState={setPageState}/>
    } else if (pageState === "settings") {
        return <SettingsMenu setPageState={setPageState}/>
    }

    // This is a fallback in case the state is invalid or if pageState is idle
    return <IdleMenu setPageState={setPageState}/>
}