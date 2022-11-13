import { P2pConnection } from "./p2pConnection";

export class P2pConnectionClient extends P2pConnection {
    protected async sendOffer() {
        this.signallingServer.getHostInfo(async data => {
            await this.connectToRemote(data.sdp, "offer");
            data.ice.forEach(this.addIceCandidate);
            const localDesc = await this.connection.createAnswer();
            await this.connection.setLocalDescription(localDesc);
            const iceAnswer = await this.iceCandidatesPromise;
            this.signallingServer.send({ sdp: localDesc.sdp!, ice: iceAnswer });
        });

        const channel = await this.p2pConnectionReady();
        channel.onMessage = (msg: MessageEvent) => {
            console.log("Received", msg);
            const data = JSON.parse(msg.data);
            this.app.store.setData(data);
        };
    }

    public connect() {
        this.sendOffer();
        this.setupReconnectLogic();
    }
}