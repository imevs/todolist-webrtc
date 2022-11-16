import { P2pConnection } from "./p2pConnection";
import { setConnectingStatus } from "./connectionStatus";

export class P2pConnectionHost extends P2pConnection {
    public async createOffer() {
        const desc = await this.connection.createOffer();
        await this.connection.setLocalDescription(desc);
        const iceCandidates = await this.iceCandidatesPromise;
        this.signallingServer.saveOffer({ sdp: desc.sdp!, ice: iceCandidates });
    };

    protected async sendOffer() {
        setConnectingStatus();
        await this.createOffer();
        this.signallingServer.onNewClient(async data => {
            await this.connectToRemote(data.sdp, "answer");
            data.ice.forEach(this.addIceCandidate);
            const newConnection = new P2pConnectionHost(this.app);
            newConnection.connect();
        });
    }

    public connect() {
        this.p2pConnectionReady().then(channel => {
            console.log("Sync data");
            setInterval(() => {
                channel.send(JSON.stringify(this.app.store.getData()));
            }, 5000);
        });
        this.sendOffer();
        this.setupReconnectLogic();
    }
}
