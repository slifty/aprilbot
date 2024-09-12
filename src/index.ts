import { requireEnv } from 'require-env-variable';
import { AprilBot } from './AprilBot';
import { getLogger } from './logger';

const logger = getLogger();

const { SOCKET_TOKEN, V2_BOT_TOKEN } = requireEnv(
	'SOCKET_TOKEN',
	'V2_BOT_TOKEN',
);

const aprilBot = new AprilBot(V2_BOT_TOKEN, SOCKET_TOKEN);
aprilBot
	.start()
	.then(() => {
		logger.info('April has started!');
	})
	.catch((error) => {
		logger.error(error);
	});
