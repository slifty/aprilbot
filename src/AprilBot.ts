import { GenericAprilBot } from './GenericAprilBot';
import { getLogger } from './logger';
import type {
	SocketModeEventPayload,
	ReactionAddedEvent,
	ReactionRemovedEvent,
	MessageEvent,
} from './types';

const logger = getLogger();

class AprilBot extends GenericAprilBot {
	constructor(userToken: string, appToken: string) {
		super(userToken, appToken);
		logger.debug('AprilBot is constructed');
	}

	protected override handleMessage = ({
		ack,
		event,
	}: SocketModeEventPayload<MessageEvent>) => {
		ack();
		logger.debug(event, 'handleMessage');
	};

	protected override handleReactionAdded = ({
		ack,
		event,
	}: SocketModeEventPayload<ReactionAddedEvent>) => {
		ack();
		logger.debug(event, 'handleReactionAdded');
	};

	protected override handleReactionRemoved = ({
		ack,
		event,
	}: SocketModeEventPayload<ReactionRemovedEvent>) => {
		ack();
		logger.debug(event, 'handleReactionRemoved');
	};
}

export { AprilBot };
