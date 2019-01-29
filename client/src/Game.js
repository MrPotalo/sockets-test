import React, { Component } from 'react';
import _ from 'lodash';
import './Game.css';

class Game extends Component {
    constructor(props) {
        super(props);

        props.Socket.on('join', ({socketId}) => {
            this.setState({id: socketId});
        });
        props.Socket.on('joinFailed', () => {
            alert('oh no');
        })
        props.Socket.on('sendState', (obj) => {
            this.setState(obj);
        });

        this.state = {};
    }

    codeEntered = (e) => {
        const code = document.getElementById('textCode').value;
        this.props.Socket.emit('joinRoom', code);
    }

    startGame = (e) => {
        this.props.Socket.emit('startGame');
    }

    placeBet = (e) => {
        let bet = document.getElementById('txtBet').value;
        this.props.Socket.emit('placeBet', bet);
    }

    canClick = true;
    clickCard(e, card, i) {
        if (this.canClick) {
            this.canClick = false;
            this.props.Socket.emit('playCard', card, i, () => {
                this.canClick = true;
            });
        }
    }

    render() {
        let game = null;
        let controlPanel = null;
        if (this.state.admin) {
            controlPanel = 
            <div id='controlPanel'>
                <input type='button' value='Start Game' onClick={this.startGame}></input>
            </div>
        }
        if (this.state.room) {
            let meIndex = _.findIndex(this.state.players, {socketId: this.props.Socket.id});
            let me = this.state.players[meIndex];
            let cards = null;
            let gameStage = null;
            let msg = null;
            if (this.state.msg) {
                msg = <div id='tempMsg'>
                    {this.state.msg}
                </div>
            }
            if (this.state.betting === meIndex) {
                gameStage = (<div id='gameInfo'>
                    <input id='txtBet' type='text' placeholder='Input bet'></input>
                    <input type='button' value='Bet' onClick={this.placeBet}></input>
                </div>)
            } else if (this.state.playing === meIndex) {
                gameStage = (<div id='gameInfo'>
                    {'Play a card'}
                </div>)
            }
            if (me && me.cards) {
                cards = <div id='myCards'>
                    {me.cards.map((card, i) => {
                        return <div key={i} onClick={this.state.playing === meIndex ? (e) => this.clickCard(e, card, i) : undefined}>{card}</div>
                    })}
                </div>
            }
            game = <div id="gameScreen">
                {controlPanel}
                {cards}
                {msg}
                {gameStage}
                {(this.state.trump ? <div id='trump'>{this.state.trump}</div> : null)}
                {(this.state.playStack ? <div id='cardStack'>
                    {this.state.playStack.map((card) => {
                        return <div>{card}</div>;
                    })}    
                </div> : null)}
                <div id='playerList'>
                    {this.state.players.map((player) => {
                        return (<div style={{color: player.socketId === this.props.Socket.id ? 'red' : 'black'}}>{player.name}</div>);
                    })}
                </div>
                <div id='scoreSheet'>
                    
                </div>
            </div>
        }
        return (
            <div id="joinScreen">
                {game ? game : 
                <div>
                    <input id='textCode' type='text' placeholder='Code'></input>
                    <input type='button' value='Join Game' onClick={this.codeEntered}></input>
                </div>
                }
            </div>
        )
    }
}

export default Game;