/// <reference path="channel.ts" />
/// <reference path="modal/ModalServerEdit.ts" />

class ServerProperties {
    virtualserver_host: string = "";
    virtualserver_port: number = 0;

    virtualserver_name: string = "";
    virtualserver_name_phonetic: string = "";
    virtualserver_icon_id: number = 0;
    virtualserver_version: string = "unknown";
    virtualserver_platform: string = "unknown";
    virtualserver_unique_identifier: string = "";

    virtualserver_clientsonline: number = 0;
    virtualserver_queryclientsonline: number = 0;
    virtualserver_channelsonline: number = 0;
    virtualserver_uptime: number = 0;
    virtualserver_maxclients: number = 0;
    virtualserver_reserved_slots: number = 0;

    virtualserver_password: string = "";
    virtualserver_flag_password: boolean = false;

    virtualserver_welcomemessage: string = "";

    virtualserver_hostmessage: string = "";
    virtualserver_hostmessage_mode: number = 0;

    virtualserver_hostbanner_url: string = "";
    virtualserver_hostbanner_gfx_url: string = "";
    virtualserver_hostbanner_gfx_interval: number = 0;
    virtualserver_hostbanner_mode: number = 0;

    virtualserver_hostbutton_tooltip: string = "";
    virtualserver_hostbutton_url: string = "";
    virtualserver_hostbutton_gfx_url: string = "";

    virtualserver_codec_encryption_mode: number = 0;

    virtualserver_default_music_group: number = 0;
    virtualserver_default_server_group: number = 0;
    virtualserver_default_channel_group: number = 0;
    virtualserver_default_channel_admin_group: number = 0;

    //Special requested properties
    virtualserver_default_client_description: string = "";
    virtualserver_default_channel_description: string = "";
    virtualserver_default_channel_topic: string = "";

    virtualserver_antiflood_points_tick_reduce: number = 0;
    virtualserver_antiflood_points_needed_command_block: number = 0;
    virtualserver_antiflood_points_needed_ip_block: number = 0;

    virtualserver_complain_autoban_count: number = 0;
    virtualserver_complain_autoban_time: number = 0;
    virtualserver_complain_remove_time: number = 0;

    virtualserver_needed_identity_security_level: number = 8;
    virtualserver_weblist_enabled: boolean = false;
    virtualserver_min_clients_in_channel_before_forced_silence: number = 0;

    virtualserver_max_upload_total_bandwidth: number = 0;
    virtualserver_upload_quota: number = 0;
    virtualserver_max_download_total_bandwidth: number = 0;
    virtualserver_download_quota: number = 0;
}

interface ServerAddress {
    host: string;
    port: number;
}

class ServerEntry {
    remote_address: ServerAddress;
    channelTree: ChannelTree;
    properties: ServerProperties;

    private info_request_promise: Promise<void> = undefined;
    private info_request_promise_resolve: any = undefined;
    private info_request_promise_reject: any = undefined;

    lastInfoRequest: number = 0;
    nextInfoRequest: number = 0;
    private _htmlTag: JQuery<HTMLElement>;

    constructor(tree, name, address: ServerAddress) {
        this.properties = new ServerProperties();
        this.channelTree = tree;
        this.remote_address = address;
        this.properties.virtualserver_name = name;
    }

    get htmlTag() {
        if(this._htmlTag) return this._htmlTag;

        let tag = $.spawn("div").addClass("tree-entry server");

        tag.append(
            $.spawn("div")
            .addClass("server_type icon client-server_green")
        );

        tag.append(
            $.spawn("div")
            .addClass("name")
            .text(this.properties.virtualserver_name)
        );

        tag.append(
            $.spawn("div")
            .addClass("icon_property icon_empty")
        );

        return this._htmlTag = tag;
    }

    initializeListener(){
        this._htmlTag.click(() => {
            this.channelTree.onSelect(this);
        });

        if(!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            this.htmlTag.on("contextmenu", (event) => {
                event.preventDefault();
                if($.isArray(this.channelTree.currently_selected)) { //Multiselect
                    (this.channelTree.currently_selected_context_callback || ((_) => null))(event);
                    return;
                }

                this.channelTree.onSelect(this, true);
                this.spawnContextMenu(event.pageX, event.pageY, () => { this.channelTree.onSelect(undefined, true); });
            });
        }
    }

    spawnContextMenu(x: number, y: number, on_close: () => void = () => {}) {
        let trigger_close = true;
        spawn_context_menu(x, y, {
                type: MenuEntryType.ENTRY,
                name: tr("Show server info"),
                callback: () => {
                    trigger_close = false;
                    this.channelTree.client.select_info.open_popover()
                },
                icon: "client-about",
                visible: this.channelTree.client.select_info.is_popover()
            }, {
                type: MenuEntryType.HR,
                visible: this.channelTree.client.select_info.is_popover(),
                name: ''
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-virtualserver_edit",
                name: tr("Edit"),
                callback: () => {
                    Modals.createServerModal(this, properties => {
                        log.info(LogCategory.SERVER, tr("Changing server properties %o"), properties);
                        console.log(tr("Changed properties: %o"), properties);
                        if (properties)
                            this.channelTree.client.serverConnection.send_command("serveredit", properties).then(() => {
                                this.channelTree.client.sound.play(Sound.SERVER_EDITED_SELF);
                            });
                    });
                }
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-iconviewer",
                name: tr("View icons"),
                callback: () => Modals.spawnIconSelect(this.channelTree.client)
            }, {
                type: MenuEntryType.ENTRY,
                icon: 'client-iconsview',
                name: tr("View avatars"),
                callback: () => Modals.spawnAvatarList(this.channelTree.client)
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-invite_buddy",
                name: tr("Invite buddy"),
                callback: () => {
                    const address = this.channelTree.client.serverConnection.remote_address().host + ":" + this.channelTree.client.serverConnection.remote_address().port;
                    const parameter = "connect_default=1&connect_address=" + encodeURIComponent(address);
                    const url =  document.location.origin +  document.location.pathname + "?" + parameter;

                    copy_to_clipboard(url);
                    createInfoModal(tr("Buddy invite URL"), tr("Your buddy invite URL:<br>") + url + tr("<bt>This has been copied to your clipboard.")).open();
                }
            },
            MenuEntry.CLOSE(() => (trigger_close ? on_close : () => {})())
        );
    }

    updateVariables(is_self_notify: boolean, ...variables: {key: string, value: string}[]) {
        let group = log.group(log.LogType.DEBUG, LogCategory.SERVER, tr("Update properties (%i)"), variables.length);

        {
            const entries = [];
            for(const variable of variables)
                entries.push({
                    key: variable.key,
                    value: variable.value,
                    type: typeof (this.properties[variable.key])
                });
            log.table("Server update properties", entries);
        }

        let update_bannner = false;
        for(let variable of variables) {
            JSON.map_field_to(this.properties, variable.value, variable.key);

            if(variable.key == "virtualserver_name") {
                this.htmlTag.find(".name").text(variable.value);
                this.channelTree.client.tag_connection_handler.find(".server-name").text(variable.value);
                server_connections.update_ui();
            } else if(variable.key == "virtualserver_icon_id") {
                /* For more detail lookup client::updateVariables and client_icon_id!
                 * ATTENTION: This is required!
                 */
                this.properties.virtualserver_icon_id = variable.value as any >>> 0;

                if(this.channelTree.client.fileManager && this.channelTree.client.fileManager.icons)
                    this.htmlTag.find(".icon_property").replaceWith(this.channelTree.client.fileManager.icons.generateTag(this.properties.virtualserver_icon_id).addClass("icon_property"));
            } else if(variable.key.indexOf('hostbanner') != -1) {
                update_bannner = true;
            }
        }
        if(update_bannner)
            this.channelTree.client.select_info.update_banner();

        group.end();
        if(is_self_notify && this.info_request_promise_resolve) {
            this.info_request_promise_resolve();
            this.info_request_promise = undefined;
            this.info_request_promise_reject = undefined;
            this.info_request_promise_resolve = undefined;
        }
    }

    updateProperties() : Promise<void> {
        if(this.info_request_promise && Date.now() - this.lastInfoRequest < 1000) return this.info_request_promise;
        this.lastInfoRequest = Date.now();
        this.nextInfoRequest =  this.lastInfoRequest + 10 * 1000;
        this.channelTree.client.serverConnection.send_command("servergetvariables").catch(error => {
            this.info_request_promise_reject(error);
            this.info_request_promise = undefined;
            this.info_request_promise_reject = undefined;
            this.info_request_promise_resolve = undefined;
        });

        return this.info_request_promise = new Promise<void>((resolve, reject) => {
            this.info_request_promise_reject = reject;
            this.info_request_promise_resolve = resolve;
        });
    }

    shouldUpdateProperties() : boolean {
        return this.nextInfoRequest < Date.now();
    }

    calculateUptime() : number {
        if(this.properties.virtualserver_uptime == 0 || this.lastInfoRequest == 0) return this.properties.virtualserver_uptime;
        return this.properties.virtualserver_uptime + (new Date().getTime() - this.lastInfoRequest) / 1000;
    }
}