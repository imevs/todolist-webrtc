import { SignallingServer } from "./signallingServer";
import { log, setConnectedStatus, setDisconnectedStatus } from "./connectionStatus";

type Client = {
    objectID: string;
    store: {
        getData: () => any;
        setData: (data: any) => void;
        onDataUpdated: (callback: (data: any) => void) => void;
    }
};

export type Channel = {
    send: (msg: string) => void;
    onMessage: (msg: MessageEvent) => void;
};

export abstract class P2pConnection {

    protected connection: RTCPeerConnection;
    protected channel: RTCDataChannel | undefined;
    protected iceCandidatesPromise: Promise<RTCIceCandidateInit[]>;
    protected signallingServer: SignallingServer;
    // https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
    // https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
    protected iceServers = [
        // { urls: 'stun:stun.l.google.com:19302' },
        // { urls: 'stun:stun1.l.google.com:19302' },
        // { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
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
    }

    public createConnectionReady(): Promise<Channel> {
        log(this.createConnectionReady.name);

        return new Promise((resolve, _reject) => {
            this.channel = this.channel && this.channel.readyState === "open"
                ? this.channel
                : this.connection.createDataChannel("dataChannel");

            const channelExport: Channel = {
                send: msg => this.channel?.send(msg),
                onMessage: msg => { log("default onMessage", msg); },
            };
            this.channel.addEventListener("close", () => {
                log("channel state changed: " + this.channel?.readyState);
            });
            this.channel.addEventListener("open", () => {
                log("channel state changed: " + this.channel?.readyState);
                resolve(channelExport);
            });
            this.channel.addEventListener("message", data => {
                channelExport.onMessage(data);
            });
            this.connection.addEventListener("datachannel", event => {
                log("datachannel: ", event);
                this.channel = event.channel;
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
            log("iceConnectionState", this.connection.iceConnectionState);
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
                    this.enableDataSynchronization().then();
                    break;
            }
        });
    }

    public enableDataSynchronization() {
        return this.createConnectionReady().then(channel => {
            log("p2pConnectionReady");
            this.app.store.onDataUpdated(data => {
                log("Sync data", data);
                channel.send(JSON.stringify(data));
            });
            channel.onMessage = msg => {
                log("Received", msg.data);
                const parsedData = JSON.parse(msg.data);
                if (!parsedData.isTrusted) {
                    this.app.store.setData(parsedData);
                }
            };
            return channel;
        });
    }

}
