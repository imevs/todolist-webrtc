import { P2pConnectionHost } from "./p2pHost";
import { P2pConnectionClient } from "./p2pClient";
import { todoApp } from "../todoApp/app";

const isHost = window.location.search.indexOf("host") !== -1;

const client = {
    objectID: "636975d12b3499323bf8cea7", // read from url, create new if it does not exist
    store: {
        onDataUpdated: (callback: (data: any) => void) => {
            todoApp.store.onDataUpdated(callback);
        },
        setData: (data: any) => {
            todoApp.store.setLocalStorage(data);
            todoApp._filter(true);
        },
    }
};

const connection = isHost
    ? new P2pConnectionHost(client)
    : new P2pConnectionClient(client);
connection.connect();