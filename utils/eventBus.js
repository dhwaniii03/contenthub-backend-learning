import { EventEmitter } from "events";

/**
 * Global Event Bus to decouple modules
 */
const eventBus = new EventEmitter();

export default eventBus;
