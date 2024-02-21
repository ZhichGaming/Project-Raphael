import "../styles/ChatMenu.css";

export default function ChatMenu({ setPageState }: { setPageState: (pageState: string) => void }) {
    return (
        <div>
            <div id="chat">
                <div id="answer">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ac turpis egestas maecenas pharetra convallis posuere. Malesuada fames ac turpis egestas sed tempus urna. Libero volutpat sed cras ornare arcu dui vivamus arcu felis. Maecenas sed enim ut sem viverra. Nec sagittis aliquam malesuada bibendum arcu vitae. Morbi tristique senectus et netus et. Viverra tellus in hac habitasse platea. Viverra nam libero justo laoreet. Pulvinar sapien et ligula ullamcorper malesuada. Volutpat diam ut venenatis tellus in metus. Fames ac turpis egestas maecenas pharetra convallis posuere. Ultrices vitae auctor eu augue ut. Integer quis auctor elit sed vulputate mi sit amet mauris. Sollicitudin nibh sit amet commodo nulla facilisi nullam.

Arcu odio ut sem nulla. Tellus molestie nunc non blandit massa enim nec dui. Luctus venenatis lectus magna fringilla. A lacus vestibulum sed arcu non odio. Cursus metus aliquam eleifend mi in nulla posuere sollicitudin. Semper eget duis at tellus at urna. Amet consectetur adipiscing elit ut aliquam purus. Consequat interdum varius sit amet mattis vulputate enim. Dui nunc mattis enim ut tellus. Gravida cum sociis natoque penatibus. Massa massa ultricies mi quis hendrerit dolor magna eget est. Fringilla est ullamcorper eget nulla facilisi etiam. Odio ut sem nulla pharetra diam sit. Volutpat blandit aliquam etiam erat velit scelerisque in dictum non. At auctor urna nunc id cursus metus aliquam. Orci nulla pellentesque dignissim enim sit amet venenatis urna cursus. Ipsum dolor sit amet consectetur. Vitae ultricies leo integer malesuada nunc. At volutpat diam ut venenatis tellus in metus.</div>
                <div id="question">
                    <div id="text">
                        <div id="words" role="textbox" aria-multiline="true" data-can-focus="true" data-slate-editor="true" data-slate-node="value" contentEditable="true"></div>
                       
                    </div>
                    <div id="microphone">
                        <img id="icon" src="src/public/white-microphone.svg" alt="Microphone"></img>
                    </div>
                </div>
            </div>
            <canvas id="sun"/>
        </div>
    );
}
