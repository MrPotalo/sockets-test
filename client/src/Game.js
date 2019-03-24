import React, { Component } from 'react';
import _ from 'lodash';
import './Game.css';

class Game extends Component {
    constructor(props) {
        super(props);


        props.Socket.on('join', ({socketId}) => {
            this.setState({id: socketId});
        });
        props.Socket.on("dataChanged", (data) => {
            this.setState({gameData: data});
        })
        props.Socket.on("gameStart", () => {
            this.setState({stage: "answer"});
        })
        props.Socket.on("gameStageGuess", (index) => {
            this.setState({stage: "guess", guessingIndex: index});
        })
        props.Socket.on("madeGuess", (guesser, answer, guessed, correct) => {
            this.setState({message: this.state.gameData.players[guesser].name + " has guessed that " + this.state.gameData.players[guessed].name + " said \"" + answer + "\". They are " + (correct ? "correct!" : "wrong!")});
            
            setTimeout(() => {
                this.props.Socket.emit("nextGuesser");
            }, 5000)
        })
        props.Socket.on("playerOut", (playerIndex) => {
            this.setState((oldState) => {
                let newState = _.clone(oldState);
                newState.gameData.players[playerIndex].isOut = true;
                return newState;
            })
        })
        props.Socket.on("gameOver", () => {
            this.setState((oldState) => {
                return {stage: "answer", message: null, gameData: {answers: null, players: oldState.gameData.players.map((player) => {player.isOut = null; return player})}, guessingIndex: -1}
            });
        });

        this.state = {screen: "start", stage: "start", playerData: {code: "", name: ""}, guessPlayerIndex: -1, guessAnswerIndex: -1};
    }

    onChange = (e) => {
        const val = e.target.value;
        const index = e.target.dataset.index;
        this.setState((oldState) => {
            let newState = _.clone(oldState);
            _.set(newState, index, val);
            return newState;
        })
    }

    hostGame = (e) => {
        this.props.Socket.emit("createGame", (roomCode) => {
            this.setState({screen: "hosting", roomCode});
        })
    }
    startGame = (e) => {
        this.props.Socket.emit("startGame", this.state.roomCode);
    }


    attemptJoin = (e) => {
        this.setState({waiting: true});
        this.props.Socket.emit("requestJoin", this.state.playerData, (data, err) => {
            this.setState({waiting: undefined});
            if (!err) {
                this.setState({screen: "mainGame", myIndex: data.index});
            } else {
                alert(err.Message);
            }
        })
    }
    submitAnswer = (e) => {
        this.props.Socket.emit("submitAnswer", this.state.answer, (success) => {
            if (success) {
                this.setState({stage: "guess", guessingIndex: -1});
            }
        });
    }

    render() {
        let content = null;
        switch (this.state.screen) {
            case "hosting":
                let innerContent = null;
                switch (this.state.stage) {
                    case "answer":
                        innerContent = (
                            <span>Players are answering.</span>
                        );
                        break;
                    case "guess":
                            innerContent = (
                                [<span>{(this.state.message || "Player " + this.state.gameData.players[this.state.guessingIndex].name + " is guessing.")}</span>,
                                <div style={{display: "flex", flexDirection: "column", height: "80%", position: "absolute", left: "50px", top: "50px"}}>,
                                {this.state.gameData.answers.map((answer, i) => {
                                    return <div key={i}>{answer.answer}</div>
                                })}
                                </div>]
                            )
                            break;
                    case "start":
                    default:
                            innerContent = (
                                <input onClick={this.startGame} style={{marginTop: "50px"}} type="button" value="Start game"></input>
                            ) 
                }
                content = (
                    <div>
                        <span style={{fontSize: "24pt"}}>{"Code: " + this.state.roomCode}</span>
                        <br/>
                        {innerContent}
                    </div>
                );
                break;
            case "mainGame":
                let innerGameContent = null;
                switch (this.state.stage) {
                    case "answer":
                        innerGameContent = (
                            [<span>Enter your answer: </span>,<input onChange={this.onChange} data-index="answer" value={this.state.answer} type="text"></input>,
                            <br/>,
                            <input onClick={this.submitAnswer} type="button" value="Submit"></input>]
                        )
                        break;
                    case "guess":
                        if (this.state.guessingIndex == this.state.myIndex) {
                            innerGameContent = [
                                <span>Make a guess:</span>,
                                <div style={{display: "flex", flexDirection: "column"}}>
                                    {this.state.gameData.answers.map((answer, i) => {
                                        return <div style={{display: "flex", flexDirection: "row", justifyContent: "center"}}>
                                            <div onClick={(e) => {this.setState({guessAnswerIndex: i})}} key={i} style={{color: (this.state.gameData.players[answer.index].isOut ? "red" : "black"), border: (i == this.state.guessAnswerIndex) ? "1px solid red" : "1px solid black"}}>{answer.answer}</div>
                                            <div style={{width: "20px"}}></div>
                                            <div onClick={(e) => {
                                                if (this.state.gameData.players[i].name !== this.state.playerData.name)
                                                    this.setState({guessPlayerIndex: i});
                                                }} key={i} style={{color: (this.state.gameData.players[i].isOut ? "red" : "black"), border: (i == this.state.guessPlayerIndex) ? "1px solid red" : "1px solid black"}}>{this.state.gameData.players[i].name}</div>
                                        </div>
                                    })}
                                </div>,
                                <input onClick={(e) => {
                                    if (this.state.guessAnswerIndex === -1 || this.state.guessPlayerIndex === -1)
                                        return;
                                    this.props.Socket.emit("makeGuess", this.state.gameData.answers[this.state.guessAnswerIndex].index, this.state.guessPlayerIndex, (success) => {
                                        if (success) {
                                            this.setState({guessingIndex: -1});
                                        }
                                    });
                                }} type="button" value="Make guess"></input>
                            ];
                        }
                        break;
                }
                content = (
                    <div>
                        {innerGameContent}
                        <div id="playerList" style={{position: "absolute", bottom: "0px",width: "100%", height: "40px", display: "flex", flexDirection: "row"}}>
                            {_.map(_.get(this.state, "gameData.players", []), (player, i) => {
                                return <div key={i} style={{border: "1px solid black", height: "100%", width: "100%"}}>{player.name}</div>
                            })}
                        </div>
                    </div>
                );
                break;
            case "start":
            default:
                content = (
                    <div>
                        
                        {this.state.joinGame ? 
                            <div>
                                <span>Room code: </span>
                                <input id="txtCode" data-index={"playerData.code"} value={this.state.playerData.code} onChange={this.onChange} type="text" placeholder="CODE"></input>
                                <br/>
                                <span>Your name: </span>
                                <input id="txtName" data-index={"playerData.name"} value={this.state.playerData.name} onChange={this.onChange} type="text" placeholder="NAME"></input>
                                <br/>
                                <input onClick={this.attemptJoin} id="btnFinalJoin" type="button" value="Join"></input>
                                {this.state.waiting ? 
                                    <div>Waiting...</div>
                                    :
                                    null
                                }
                            </div>
                            :
                            <div>
                                <input id="btnJoinGame" style={{position: "absolute",left: 0,border: "none", backgroundColor: "transparent"}} onClick={this.hostGame} type="button" value="Host Game"></input>
                                <input onClick={(e) => this.setState({joinGame: true})} type="button" value="Join Game"></input>
                            </div>}
                    </div>
                );
        }
        return <div id="mainScreen">
            {content}
        </div>
    }
}

export default Game;