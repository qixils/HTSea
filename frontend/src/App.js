import './App.css';
import {WhiteButton, BlueButton} from "./components/Sea/SeaButton";
const inviteURL = `https://discord.com/api/oauth2/authorize?client_id=${process.env.REACT_APP_CLIENT_ID}&permissions=0&scope=bot%20applications.commands`;
function App() {
  return (
    <div className="App">
      <div className="AppContent">
        <h1>Discover, collect, and sell HTNFTs.</h1>
        <h2><i>The Forbes #1 Innovation in Technology and Computing for 2022</i></h2>
        <p>
          The digital revolution is upon us.
          Using our patent-pending e-currency technology codenamed Diamonds, we empower creators
          like you to take ownership of your one-of-a-kind centralized assets.
          On any participating Discord server, simply right click any message you've sent and click
          on <b>Mint HTNFT</b> to create your piece of digital history.
          Before you do that, you'll need to mine some Diamonds using our state-of-the-art
          technology.
          Diamonds can be obtained through the tried-and-true method of mining them on
          the <b>mc.qixils.dev</b> Minecraft: Java Edition server or by completing rounds of the hit
          game Wordle.
        </p>
        <div className="button-wrapper">
          <WhiteButton><a href="/activity">Recent Activity</a></WhiteButton>
          <WhiteButton><a href="/wordle">Play Wordle</a></WhiteButton>
          <WhiteButton><a href={inviteURL}>Add the Discord Bot</a></WhiteButton>
          <BlueButton>mc.qixils.dev</BlueButton>
        </div>
      </div>
    </div>
  );
}

export default App;
