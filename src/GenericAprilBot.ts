import { SocketModeClient } from '@slack/socket-mode';
import { WebClient } from '@slack/web-api';
import type {
	SocketModeEventPayload,
	ReactionAddedEvent,
	ReactionRemovedEvent,
	MessageEvent,
} from './types';

abstract class GenericAprilBot {
	private readonly userToken: string;

	private readonly appToken: string;

	protected readonly socketModeClient: SocketModeClient;

	protected readonly webClient: WebClient;

	constructor(userToken: string, appToken: string) {
		this.userToken = userToken;
		this.appToken = appToken;
		this.socketModeClient = new SocketModeClient({
			appToken: this.appToken,
		});
		this.webClient = new WebClient(this.userToken);
	}

	public async start(): Promise<void> {
		this.socketModeClient.on('message', this.handleMessage);
		this.socketModeClient.on('reaction_added', this.handleReactionAdded);
		this.socketModeClient.on('reaction_removed', this.handleReactionRemoved);
		await this.socketModeClient.start();
	}

	protected abstract handleMessage: (
		args: SocketModeEventPayload<MessageEvent>,
	) => void;

	protected abstract handleReactionAdded: (
		args: SocketModeEventPayload<ReactionAddedEvent>,
	) => void;

	protected abstract handleReactionRemoved: (
		args: SocketModeEventPayload<ReactionRemovedEvent>,
	) => void;
}

export { GenericAprilBot };
