export type Offer = { sdp: string; ice: RTCIceCandidateInit[]; };

export type SessionInfo = {
    message?: string;
    initial?: Offer;
    answer?: Offer;
};

const SERVICE_PATH = "https://api.jsonbin.io/v3";
const accessToken = "$2b$10$YE9Sljt4vjsX7w1GzojOVOkibhD.DRrH7eAGncSpfhmStD6Dp/kPO";

const saveData = (path: string, resourceID: string, data: string) => {
    const req = new XMLHttpRequest();

    req.onreadystatechange = () => {
        if (req.readyState == XMLHttpRequest.DONE) {
            console.log("Signalling data saved");
        }
    };

    req.open("PUT", `${path}/b/${resourceID}`, true);
    req.setRequestHeader("Content-type", "application/json");
    req.setRequestHeader("X-Access-Key", accessToken);
    req.setRequestHeader("X-Bin-Private", "true");
    // req.setRequestHeader("X-Bin-Name", resourceID); // uncomment for creating data
    req.send(data);
};

const fetchRemoteSdp = async (path: string, resourceID: string): Promise<SessionInfo> => {
    return (await fetch(`${path}/b/${resourceID}/latest`, { headers: { "X-Access-Key": accessToken, "X-Bin-Meta": "false" } })).json();
};


export class SignallingServer {

    public constructor(public readonly objectID: string) {
    }

    public sessionInfo: SessionInfo | undefined;

    public save(data: SessionInfo) {
        saveData(SERVICE_PATH, this.objectID, JSON.stringify(data));
    }

    public saveOffer(data: Offer) {
        this.save({ initial: data, answer: { sdp: "", ice: [] } });
    }

    public answer(data: Offer) {
        this.save({ ...this.sessionInfo!, answer: data });
    }

    public getHostInfo(callback: (msg: Offer) => void) {
        fetchRemoteSdp(SERVICE_PATH, this.objectID).then(data => {
            console.log("fetchRemoteSdp", data);
            this.sessionInfo = data;
            if (data.initial) {
                callback({
                    sdp: data.initial.sdp,
                    ice: data.initial.ice,
                });
            }
        });
    }

    public onNewClient(callback: (msg: Offer) => void) {
        let copyOriginOfferAnswer: Offer = { sdp: "", ice: [] };
        const checkData = setInterval(() => {
            fetchRemoteSdp(SERVICE_PATH, this.objectID).then(data => {
                this.sessionInfo = data;
                const answer = data.answer;
                if (answer?.sdp && answer?.sdp !== copyOriginOfferAnswer?.sdp) {
                    copyOriginOfferAnswer = answer;
                    callback({ sdp: answer.sdp, ice: answer.ice });
                    clearInterval(checkData);
                }
            });
        }, 5000);
    }

}