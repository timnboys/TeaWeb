namespace audio {
    export namespace recorder {
        export interface InputDevice {
            unique_id: string;
            name: string;
            default_input: boolean;

            supported: boolean;

            sample_rate: number;
            channels: number;
        }

        export enum InputConsumerType {
            CALLBACK,
            NODE,
            NATIVE
        }

        export interface InputConsumer {
            type: InputConsumerType;
        }

        export interface CallbackInputConsumer extends InputConsumer {
            callback_audio?: (buffer: AudioBuffer) => any;
            callback_buffer?: (buffer: Float32Array, samples: number, channels: number) => any;
        }

        export interface NodeInputConsumer extends InputConsumer {
            callback_node: (source_node: AudioNode) => any;
            callback_disconnect: (source_node: AudioNode) => any;
        }


        export namespace filter {
            export enum Type {
                THRESHOLD,
                VOICE_LEVEL,
                STATE
            }

            export interface Filter {
                type: Type;

                is_enabled() : boolean;
            }

            export interface MarginedFilter {
                get_margin_frames() : number;
                set_margin_frames(value: number);
            }

            export interface ThresholdFilter extends Filter, MarginedFilter {
                get_threshold() : number;
                set_threshold(value: number) : Promise<void>;

                callback_level?: (value: number) => any;
            }

            export interface VoiceLevelFilter extends Filter, MarginedFilter {
                get_level() : number;
            }

            export interface StateFilter extends Filter {
                set_state(state: boolean) : Promise<void>;
                is_active() : boolean; /* if true the the filter allows data to pass */
            }
        }

        export enum InputState {
            PAUSED,
            INITIALIZING,
            RECORDING,
            DRY
        }

        export interface AbstractInput {
            callback_begin: () => any;
            callback_end: () => any;

            current_state() : InputState;

            start() : Promise<void>;
            stop() : Promise<void>;

            current_device() : InputDevice | undefined;
            set_device(device: InputDevice | undefined) : Promise<void>;

            current_consumer() : InputConsumer | undefined;
            set_consumer(consumer: InputConsumer) : Promise<void>;

            get_filter(type: filter.Type) : filter.Filter | undefined;
            supports_filter(type: audio.recorder.filter.Type) : boolean;

            clear_filter();
            disable_filter(type: filter.Type);
            enable_filter(type: filter.Type);

        }
    }
}