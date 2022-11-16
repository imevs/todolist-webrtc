import { SignallingServer} from "./signallingServer";
import {setConnectedStatus, setDisconnectedStatus} from "./connectionStatus";

type Client = {
    objectID: string;
    store: {
        getData: () => any;
        setData: (data: any) => void;
        onDataUpdated: (callback: (data: any) => void) => void;
    }
};

export abstract class P2pConnection {

    protected connection: RTCPeerConnection;
    protected iceCandidatesPromise: Promise<RTCIceCandidateInit[]>;
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
            const iceCandidates: RTCIceCandidateInit[] = [];
            this.connection.addEventListener("icecandidate", event => {
                if (event.candidate) {
                    iceCandidates.push(event.candidate.toJSON());
                } else {
                    resolve(iceCandidates);
                }
            });
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
            channel.addEventListener("open", () => {
                const readyState = channel.readyState;
                console.log((new Date()).toISOString(), 'channel state is: ' + readyState);
                resolve(channelExport);
            });
            this.connection.addEventListener("datachannel", event => {
                channel = event.channel;
                channelExport.channel = channel;
            });
            channel.addEventListener("message", data => {
                channelExport.onMessage(data);
            });
        });
    }

    public addIceCandidate = (candidate: RTCIceCandidateInit) => {
        return this.connection.addIceCandidate(candidate).catch(err => {
            console.error("addIceCandidate::error", candidate, err);
        });
    };

    public connectToRemote(sdp: string, type: "offer" | "answer") {
        return this.connection.setRemoteDescription(new RTCSessionDescription({ sdp: sdp, type: type }));
    };

    protected abstract sendOffer(): void;

    public setupReconnectLogic() {
        this.connection.addEventListener("iceconnectionstatechange", () => {
            console.log((new Date()).toISOString(), "iceConnectionState", this.connection.iceConnectionState);
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
        });
    }

    public syncData() {
        return this.p2pConnectionReady().then(channel => {
            console.log((new Date()).toISOString(), "p2pConnectionReady");
            this.app.store.onDataUpdated(data => {
                console.log((new Date()).toISOString(), "Sync data");
                channel.send(JSON.stringify(data));
            });
            channel.onMessage = (msg: MessageEvent) => {
                console.log((new Date()).toISOString(), "Received", msg.data);
                this.app.store.setData(JSON.parse(msg.data));
            };
            return channel;
        });
    }

    public connect() {
        this.syncData();
        this.sendOffer();
        this.setupReconnectLogic();
    }
}
