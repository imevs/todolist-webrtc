import { SessionInfo } from "./signallingServer";
import { P2pConnection } from "./p2pConnection";
import { setConnectingStatus } from "./connectionStatus";

export class P2pConnectionHost extends P2pConnection {
    public async createOffer(): Promise<SessionInfo> {
        const desc = await this.connection.createOffer();
        await this.connection.setLocalDescription(desc);
        const iceCandidates = await this.iceCandidatesPromise;
        const originOffer = {
            initial: {
                sdp: desc.sdp!,
                ice: iceCandidates,
            },
            answer: {
                sdp: "",
                ice: [],
            },
        };
        this.signallingServer.save(originOffer);
        return originOffer;
    };

    protected sendOffer() {
        this.createOffer().then(offer => {
            setConnectingStatus();
            this.signallingServer.onNewClient(offer, async data => {
                await this.connectToRemote(data.sdp, "answer");
                data.ice.forEach(this.addIceCandidate);
                const newConnection = new P2pConnectionHost(this.app);
                newConnection.connect();
            });
        });
    }

    public connect() {
        this.p2pConnectionReady().then((channel) => {
            console.log("Send data");
            setInterval(() => {
                channel.send(JSON.stringify(this.app.store.getData()));
            }, 5000);
        });
        this.sendOffer();
        this.setupReconnectLogic();
    }
}
