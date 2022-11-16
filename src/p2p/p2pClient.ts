import { P2pConnection } from "./p2pConnection";

export class P2pConnectionClient extends P2pConnection {
    protected async sendOffer() {
        this.signallingServer.getHostInfo(async data => {
            await this.connectToRemote(data.sdp, "offer");
            data.ice.forEach(this.addIceCandidate);
            const localDesc = await this.connection.createAnswer();
            await this.connection.setLocalDescription(localDesc);
            const iceAnswer = await this.iceCandidatesPromise;
            this.signallingServer.answer({ sdp: localDesc.sdp!, ice: iceAnswer });
        });
    }
}