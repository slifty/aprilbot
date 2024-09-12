interface MessageEvent {
	user: string;
	type: string;
	ts: string;
	client_msg_id: string;
	text: string;
	team: string;
	thread_ts?: string;
	blocks: MessageBlock[];
	channel: string;
	event_ts: string;
	channel_type: string;
}

interface MessageBlock {
	type: string;
	block_id: string;
	elements: BlockElement[];
}

interface BlockElement {
	type: string[];
	elements: BlockElementElement[];
}

interface BlockElementElement {
	type: string;
	text: string;
}

export { MessageEvent };
