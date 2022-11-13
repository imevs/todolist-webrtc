import { SignallingServer} from "./signallingServer";
import {setConnectedStatus, setDisconnectedStatus} from "./connectionStatus";

type Client = {
    objectID: string;
    store: {
        setData: (data: any) => void;
        getData: () => any;
    }
};

export abstract class P2pConnection {

    protected connection: RTCPeerConnection;
    protected iceCandidatesPromise: Promise<string[]>;
    protected signallingServer: SignallingServer;
    protected p2pConnectionReady: () => Promise<{
        send: (msg: string) => void;
        onMessage: (msg: MessageEvent) => void;
    }>;
    // https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
    // https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
    protected iceServers = [
        // { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // { urls: 'stun:stun2.l.google.com:19302' },
        // { urls: 'stun:stun3.l.google.com:19302' },
        // { urls: 'stun:stun4.l.google.com:19302' },
    ];

    constructor(protected app: Client) {
        this.signallingServer = new SignallingServer(app.objectID);
        this.connection = new RTCPeerConnection({ iceServers: this.iceServers });

        this.iceCandidatesPromise = new Promise((resolve, _reject) => {
            const iceCandidates: string[] = [];
            this.connection.onicecandidate = (event) => {
                if (event.candidate) {
                    iceCandidates.push(event.candidate.candidate);
                } else {
                    resolve(iceCandidates);
                }
            };
        });

        const channelExport = {
            channel: null as (null | RTCDataChannel),
            send: (msg: string) => channelExport.channel?.send(msg),
            onMessage: (msg: MessageEvent) => {
                console.log("default onMessage", msg);
            },
        };
        this.p2pConnectionReady = () => new Promise((resolve, _reject) => {
            let channel: RTCDataChannel = this.connection.createDataChannel("dataChannel");
            channelExport.channel = channel;
            channel.onopen = () => {
                const readyState = channel.readyState;
                console.log('channel state is: ' + readyState);
                resolve(channelExport);
            };
            this.connection.ondatachannel = (event) => {
                console.log("ondatachannel");
                channel = event.channel;
                channelExport.channel = channel;
            };
            channel.onmessage = (data) => {
                channelExport.onMessage(data);
            };
        });
    }

    public addIceCandidate = (candidate: string) => {
        return this.connection.addIceCandidate(new RTCIceCandidate({
            candidate: candidate,
            sdpMLineIndex: 0,
            sdpMid: "data",
        }));
    };

    public connectToRemote(sdp: string, type: "offer" | "answer") {
        return this.connection.setRemoteDescription(new RTCSessionDescription({ sdp: sdp, type: type }));
    };

    protected abstract sendOffer(): void;
    public abstract connect(): void;

    public setupReconnectLogic() {
        // let isReconnecting = false;
        /*
                window.addEventListener('unhandledrejection', (error) => {
                    if (isReconnecting) return;
                    console.log("Fail to connect");
                    setDisconnectedStatus();
                    isReconnecting = true;
                    setTimeout(() => {
                        this.sendOffer();
                        isReconnecting = false;
                    }, 1000);
                });
        */

        this.connection.oniceconnectionstatechange = () => {
            console.log("iceConnectionState", this.connection.iceConnectionState);
            switch (this.connection.iceConnectionState) {
                case "connected":
                case "completed":
                    setConnectedStatus();
                    break;
                case "closed":
                case "failed":
                case "disconnected":
                    setDisconnectedStatus();
                    this.sendOffer();
                    break;
            }
        };
    }
}
