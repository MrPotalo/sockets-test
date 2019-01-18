import React, { Component } from 'react';
import './Game.css';

class Game extends Component {
    constructor(props) {
        super(props);

        props.Socket.on('gameStarted', (gameData) => {
            this.setState({ game: gameData });
        });
    }

    startGame() {
        this.props.Socket.emit('startGame');
    }

    generateTile(otherPos, otherDir){
        let pos;
        if (otherPos && otherDir) {
            pos = {x: otherPos.x + otherDir.x * 20};
        } else {
            pos = {x: 500, y: 300};
        }
    }

    render() {
        let gameBoard = [];
        if (this.state.game) {
            let done = [];
            gameBoard.push
        }
        return (
            <div id="game">
                <div id="gameContainer">
                    {gameBoard}
                </div>
                <input type="button" onClick={() => this.startGame()} value="Start Game"></input>
            </div>
        )
    }
}

export default Game;