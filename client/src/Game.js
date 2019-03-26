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
            this.setState({stage: "guess", guessingIndex: index, message: null});
        })
        props.Socket.on("madeGuess", (guesser, answer, guessed, correct) => {
            this.setState({message: this.state.gameData.players[guesser].name + " has guessed that " + this.state.gameData.players[guessed].name + " said \"" + answer + "\". They are " + (correct ? "correct!" : "wrong!")});
            
            setTimeout(() => {
                this.props.Socket.emit("nextGuesser", correct);
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
                return {stage: "answer", message: null, answer: "", gameData: {answers: null, players: oldState.gameData.players.map((player) => {player.isOut = null; return player})}, guessingIndex: -1}
            });
        });

        this.state = {
            screen: "start",
            stage: "start", 
            playerData: {code: "", name: ""}, 
            gameRules: {extraGuesses: true, guessesWhenOut: false},
            guessPlayerIndex: -1, 
            guessAnswerIndex: -1
        };
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

    checkChanged = (e) => {
        const val = e.target.checked;
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
        this.props.Socket.emit("startGame", this.state.gameRules);
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
        const playerList = (
            <div id="playerList" style={{position: "absolute", bottom: "0px",width: "100%",height: "10vh", display: "flex", flexDirection: "row"}}>
                {_.map(_.get(this.state, "gameData.players", []), (player, i) => {
                    return <div key={i} style={{backgroundColor: "#fff", border: "1px solid black", padding: "10px", height: "100%", width: "100%"}}>{player.name}</div>
                })}
            </div>
        )
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
                                <div style={{display: "flex", flexDirection: "row", height: "70vh", width: "100vw"}}>
                                    <div id="hostAnswerList" style={{display: "inline-flex", float: "left", marginLeft: "50px", marginTop: "20px", flexDirection: "column", maxHeight: "80vh", height: "fit-content", maxWidth: "50vw", marginRight: "15px"}}>
                                        {this.state.gameData.answers.map((answer, i) => {
                                            let result = [<div id="hostAnswer" key={i}>{answer.answer}</div>];
                                            if (i != this.state.gameData.answers.length-1) {
                                                result.push(<hr/>)
                                            }
                                            return result;
                                        })}
                                    </div>
                                    <span className="serverMessage" style={{maxWidth: "60vw"}}>{(this.state.message || "Player " + this.state.gameData.players[this.state.guessingIndex].name + " is guessing.")}</span>
                                </div>
                            );
                            break;
                    case "start":
                    default:
                            innerContent = [
                                <span>Game Rules</span>,
                                <br/>,
                                <span>Extra guess after correct answer:</span>,<input type="checkbox" data-index="gameRules.extraGuesses" checked={this.state.gameRules.extraGuesses} onChange={this.checkChanged}></input>,
                                <br/>,
                                <span>Can guess after your answer has been correctly guessed:</span>,<input type="checkbox" data-index="gameRules.guessesWhenOut" checked={this.state.gameRules.guessesWhenOut} onChange={this.checkChanged}></input>,
                                <br/>,
                                <input onClick={this.startGame} style={{marginTop: "50px"}} type="button" value="Start game"></input>
                            ]
                }
                content = (
                    <div>
                        <span style={{fontSize: "24pt"}}>{"Code: " + this.state.roomCode}</span>
                        <br/>
                        {innerContent}
                        {playerList}
                    </div>
                );
                break;
            case "mainGame":
                let innerGameContent = null;
                switch (this.state.stage) {
                    case "answer":
                        innerGameContent = (
                            [<span id="titleEnterAnswer">Enter your Answer</span>,
                            <br/>,
                            <input id="inputAnswer" onChange={this.onChange} data-index="answer" value={this.state.answer} type="text"></input>,
                            <br/>,
                            <input id="btnSubmitAnswer" onClick={this.submitAnswer} type="button" value="Submit"></input>]
                        )
                        break;
                    case "guess":
                        if (this.state.guessingIndex == this.state.myIndex) {
                            let answerArr = [];
                            let playerArr = [];
                            _.forEach(this.state.gameData.answers, (answer, i) => {
                                    answerArr.push(<div className={"guessAnswer " + (this.state.gameData.players[answer.index].isOut ? "out " : "") + (i == this.state.guessAnswerIndex ? "selected" : "")} onClick={(e) => {
                                        if (!this.state.gameData.players[answer.index].isOut)
                                            this.setState({guessAnswerIndex: i})
                                        }} key={i}>{answer.answer}</div>);
                                    playerArr.push(<div className={"guessPlayer " + (this.state.gameData.players[i].isOut ? "out " : "") + (i == this.state.guessPlayerIndex ? "selected" : "")} onClick={(e) => {
                                        if (this.state.gameData.players[i].name !== this.state.playerData.name && !this.state.gameData.players[i].isOut)
                                            this.setState({guessPlayerIndex: i});
                                        }} key={i}>{this.state.gameData.players[i].name}</div>);
                            })
                            innerGameContent = [
                                <span id="titleMakeGuess">Make a Guess</span>,
                                <div style={{display: "flex", flexDirection: "row", margin: "15px 0px", justifyContent: "center"}}>
                                    <div style={{display: "flex", flexDirection: "column", justifyContent: "space-between", maxHeight: "70vh", overflow: "auto"}}>
                                        {answerArr}
                                    </div>
                                    <div style={{display: "flex", flexDirection: "column", justifyContent: "space-between", maxHeight: "70vh", overflow: "auto"}}>
                                        {playerArr}
                                    </div>
                                </div>,
                                <input id="btnMakeGuess" onClick={(e) => {
                                    if (this.state.guessAnswerIndex === -1 || this.state.guessPlayerIndex === -1)
                                        return;
                                    this.props.Socket.emit("makeGuess", this.state.gameData.answers[this.state.guessAnswerIndex].index, this.state.guessPlayerIndex, (success) => {
                                        this.setState({guessingIndex: -1, guessAnswerIndex: -1, guessPlayerIndex: -1, message: (success ? "Correct!" : "Wrong!")});
                                    });
                                }} type="button" value="Make guess"></input>
                            ];
                        } else if (this.state.message) {
                            innerGameContent = (
                                <span className="serverMessage">{this.state.message}</span>
                            );
                        }
                        break;
                }
                content = (
                    <div style={{height: "100vh"}}>
                        {innerGameContent}
                        {playerList}
                    </div>
                );
                break;
            case "start":
            default:
                content = (
                    <div>
                        
                        {this.state.joinGame ? 
                            <div>
                                <div style={{display: "flex", flexDirection: "row", justifyContent: "center"}}>
                                    <div className="joinGameColFlex" style={{display: "flex", flexDirection: "column", justifyContent: "space-around"}}>
                                        <span>Room code: </span>
                                        <span>Your name: </span>
                                    </div>
                                    <div className="joinGameColFlex" style={{display: "flex", flexDirection: "column", justifyContent: "space-around"}}>
                                        <input id="txtCode" data-index={"playerData.code"} value={this.state.playerData.code} onChange={this.onChange} type="text" placeholder="CODE"></input>
                                        <input id="txtName" data-index={"playerData.name"} value={this.state.playerData.name} onChange={this.onChange} type="text" placeholder="NAME"></input>
                                    </div>
                                </div>
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
                                <input id="btnHostGame" style={{position: "absolute",right: "6px",bottom: "6px", padding: "0px",border: "none", backgroundColor: "transparent"}} onClick={this.hostGame} type="button" value="Host Game"></input>
                                <input id="btnJoinGame" onClick={(e) => this.setState({joinGame: true})} type="button" value="Join Game"></input>
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