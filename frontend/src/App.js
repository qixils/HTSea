import './App.css';
import {WhiteButton, BlueButton} from "./components/Sea/SeaButton";
function App() {
  return (
    <div className="App">
      <h1>Discover, collect, and sell HTNFTs.</h1>
      <h2><i>The Forbes #1 Innovation in Technology and Computing for 2022</i></h2>
      <h2>Buy one-of-a-kind centralized trinkets with our patent-pending Diamonds</h2>
      <h2>Using revolutionary new technology, Diamonds can be obtained through a state-of-the-art
      Minecraft server hosted at <b>mc.qixils.dev</b> or by solving games of Wordle</h2>
      <div className="button-wrapper">
        <BlueButton><a href={"/activity"}>Recent Activity</a></BlueButton>
        <BlueButton><a href={"/wordle"}>Play Wordle</a></BlueButton>
        <WhiteButton>mc.qixils.dev</WhiteButton>
      </div>
    </div>
  );
}

export default App;
