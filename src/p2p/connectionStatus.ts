export function log(...data: (string | object | number)[]) {
    console.log((new Date()).toISOString(), ...data);
}

export function setConnectedStatus() {
    log(setConnectedStatus.name);
    const bar = document.querySelector("[name=theme-color]") as HTMLMetaElement;
    bar.content = "green";
    const favicon = document.getElementById('favicon') as HTMLLinkElement;
    favicon.href = "./src/p2p/circle-green.png";
}

export function setDisconnectedStatus() {
    log(setDisconnectedStatus.name);
    const bar = document.querySelector("[name=theme-color]") as HTMLMetaElement;
    bar.content = "red";
    const favicon = document.getElementById('favicon') as HTMLLinkElement;
    favicon.href = "./src/p2p/circle-red.png";
}

export function setConnectingStatus() {
    log(setConnectingStatus.name);
    const bar = document.querySelector("[name=theme-color]") as HTMLMetaElement;
    bar.content = "orange";
    const favicon = document.getElementById('favicon') as HTMLLinkElement;
    favicon.href = "./src/p2p/circle-orange.png";
}
