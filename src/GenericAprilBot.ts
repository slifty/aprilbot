import { SocketModeClient } from '@slack/socket-mode';
import { WebClient } from '@slack/web-api';
import { getLogger } from './logger';
import type { Member } from '@slack/web-api/dist/types/response/UsersListResponse';
import type {
	SocketModeEventPayload,
	ReactionAddedEvent,
	ReactionRemovedEvent,
	MessageEvent,
} from './types';

const logger = getLogger();

abstract class GenericAprilBot {
	private readonly userToken: string;

	private readonly appToken: string;

	protected readonly socketModeClient: SocketModeClient;

	protected readonly webClient: WebClient;

	protected users: Member[] = [];

	constructor(userToken: string, appToken: string) {
		this.userToken = userToken;
		this.appToken = appToken;
		this.socketModeClient = new SocketModeClient({
			appToken: this.appToken,
		});
		this.webClient = new WebClient(this.userToken);
	}

	public async start(): Promise<void> {
		this.users = await this.loadUsers();
		this.socketModeClient.on('message', this.handleMessage);
		this.socketModeClient.on('reaction_added', this.handleReactionAdded);
		this.socketModeClient.on('reaction_removed', this.handleReactionRemoved);
		await this.socketModeClient.start();
	}

	private async loadUsers(): Promise<Member[]> {
		logger.debug('Loading users...');
		const result = await this.webClient.users.list({});
		if (!result.ok || result.members === undefined) {
			logger.error(result.error);
			throw new Error('Unable to load users.');
		}
		logger.debug(`${result.members?.length} Users loaded.`);
		return result.members;
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
