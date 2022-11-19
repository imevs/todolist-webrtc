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
    const result = (await fetch(
        `${path}/b/${resourceID}/latest`,
        { headers: { "X-Access-Key": accessToken, "X-Bin-Meta": "false" } }
    )).json();
    result.then(data => console.log("fetchRemoteSdp", data));
    return result;
};


export class SignallingServer {

    public constructor(public readonly objectID: string) {
    }

    public sessionInfo: SessionInfo | undefined;

    public save(data: SessionInfo) {
        saveData(SERVICE_PATH, this.objectID, JSON.stringify(data));
    }

    public saveOffer(data: Offer) {
        const answer = /*this.sessionInfo?.answer ?? */{ sdp: "", ice: [] };
        this.save({ initial: data, answer: answer });
    }

    public saveAnswer(data: Offer) {
        this.save({ ...this.sessionInfo!, answer: data });
    }

    public getHostInfo(type: "initial" | "answer", callback: (msg: Offer | undefined) => void) {
        fetchRemoteSdp(SERVICE_PATH, this.objectID).then(data => {
            this.sessionInfo = data;
            const result = data[type];
            callback(result ? {
                sdp: result.sdp,
                ice: result.ice,
            } : undefined);
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