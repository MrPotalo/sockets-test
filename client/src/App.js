import React, { Component } from 'react';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {msgs: []};
  }

  componentDidMount() {
    this.props.Socket.on('hey', (message) => {
      this.setState((prevState) => ({
        msgs: [...prevState.msgs, message]
      }));
    })
  }

  pushMsg() {
    this.props.Socket.emit('hey', { message: "Hey" });
  }

  render() {
    return (
      <div className="App">
        <button onClick={() => this.pushMsg()} value={"Hey"}></button>
        {this.state.msgs.map((msg) => {
          return (
            <div style={{color: msg.color || '#000'}}>{msg.message}</div>
          )
        })}
      </div>
    );
  }
}

export default App;
