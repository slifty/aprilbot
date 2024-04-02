interface SocketModeEventPayload<T> {
	event: T;
	ack: () => void;
}

export { SocketModeEventPayload };
