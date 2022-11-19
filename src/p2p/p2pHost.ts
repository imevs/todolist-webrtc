import { Channel, P2pConnection } from "./p2pConnection";
import { log, setConnectingStatus } from "./connectionStatus";

export class P2pConnectionHost extends P2pConnection {
    private async createOffer() {
        const desc = await this.connection.createOffer();
        await this.connection.setLocalDescription(desc);
        const iceCandidates = await this.iceCandidatesPromise;
        this.signallingServer.saveOffer({ sdp: desc.sdp!, ice: iceCandidates });
    };

    protected async sendOffer() {
        setConnectingStatus();
        await this.createOffer();
    }

    public connect(channels: Channel[] = []) {
        this.createChannelForClient().then(c => this.addChannel(c, channels));
        this.signallingServer.onNewClient(async data => {
            log("onNewClient");
            await this.connectToRemote(data.sdp, "answer");
            data.ice.forEach(this.addIceCandidate);

            const newConnection = new P2pConnectionHost(this.app);
            newConnection.connect(channels);
        });
    }

    public addChannel(channel: Channel, channels: Channel[]) {
        channels.push(channel);
        log("Number of channels", channels.length);
        channel.onMessage = (callback => msg => {
            callback(msg);
            log("addChannel.onMessage", msg.data);
            channels.forEach(ch => ch.send(msg.data));
        })(channel.onMessage);
    }

    public async createChannelForClient() {
        const channelPromise = this.enableDataSynchronization();
        this.sendOffer();
        this.setupReconnectLogic();
        return channelPromise.then(channel => {
            setTimeout(() => {
                channel.send(JSON.stringify(this.app.store.getData()));
            }, 500);
            return channel;
        });
    }
}
