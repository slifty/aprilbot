import { SocketModeClient } from '@slack/socket-mode';
import { WebClient } from '@slack/web-api';

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

	public async start() {
		await this.socketModeClient.start();
	}
}

export { GenericAprilBot };
