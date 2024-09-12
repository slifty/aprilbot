interface ReactionAddedEvent {
	type: string;
	user: string;
	reaction: string;
	item: {
		type: string;
		channel: string;
		ts: string;
	};
	item_user: string;
	event_ts: string;
}

export { ReactionAddedEvent };
