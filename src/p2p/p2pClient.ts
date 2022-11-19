import { P2pConnection } from "./p2pConnection";

export class P2pConnectionClient extends P2pConnection {
    protected sendOffer() {
        this.signallingServer.getHostInfo("initial", async data => {
            if (!data) {
                return;
            }
            await this.connectToRemote(data.sdp, "offer");
            data.ice.forEach(this.addIceCandidate);
            const desc = await this.connection.createAnswer();
            await this.connection.setLocalDescription(desc);
            const iceCandidates = await this.iceCandidatesPromise;
            this.signallingServer.saveAnswer({ sdp: desc.sdp!, ice: iceCandidates });
        });
    }

    public connect() {
        this.enableDataSynchronization().then();
        this.sendOffer();
        this.setupReconnectLogic();
    }
}