import { useState } from 'react';
import DefaultMenu from './DefaultMenu';
import ChatMenu from './ChatMenu';
import SettingsMenu from './SettingsMenu';

export default function MainMenu() {
    // Values: default, chat, settings
    let [pageState, _] = useState("default");

    if (pageState === "default") {
        return <DefaultMenu />
    } else if (pageState === "chat") {
        return <ChatMenu/>
    } else if (pageState === "settings") {
        return <SettingsMenu/>
    }

    // This is a fallback in case the state is invalid.
    return (
        <DefaultMenu/>
    )
}