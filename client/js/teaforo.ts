namespace forum {
    const ipc = require("electron").ipcRenderer;
    let callback_listener: (() => any)[] = [];

    ipc.on('teaforo-update', (event, data) => {
        console.log("Got data update: %o", data);
        profiles.identities.set_static_identity(data ? new profiles.identities.TeaForumIdentity(data.application_data, data.application_data_sign) : undefined);
        try {
            for(let listener of callback_listener)
                setImmediate(listener);
        } catch(e) {
            console.log(e);
        }

        callback_listener = [];
    });

    export function register_callback(callback: () => any) {
        callback_listener.push(callback);
    }

    export function open() {
        ipc.send("teaforo-login");
    }

    export function logout() {
        ipc.send("teaforo-logout");
    }

    export function sync_main() {
        ipc.send("teaforo-update");
    }
}