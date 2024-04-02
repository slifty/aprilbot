import { GenericAprilBot } from './GenericAprilBot';

class AprilBot extends GenericAprilBot {
	constructor(userToken: string, appToken: string) {
		super(userToken, appToken);
	}

	public async start() {
		await super.start();
	}
}

export { AprilBot };
