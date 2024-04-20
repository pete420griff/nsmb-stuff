#include "nsmb.hpp"

#define ALLOW_SUICIDE 		true
#define COINS_PER_STARCOIN	5

static u16 jumpKeyPressed;
static u16 jumpKeyHeld;

#if ALLOW_SUICIDE
ncp_hook(0x020fd1d8,10) // suicide on Player::onUpdate if L and R held
static void seppuku(Player* player) {
	if ((Game::getPlayerCoins(player->playerID) == 0) && 
		((player->keysHeld & Keys::R) != 0) &&
		((player->keysHeld & Keys::L) != 0)) {
		Game::setPlayerDead(player->playerID,true);
		player->switchTransitionState(&Player::standardDeathTransitState);
	}
}
#endif

ncp_jump(0x0212c828,11) // replaces Player::getJumpKeysPressed
static u16 noJumpPressWhenBroke(Player* player) {
	if (Game::getPlayerCoins(player->playerID) != 0)
		jumpKeyPressed = (player->keysPressed & (Keys::A | Keys::B)) != 0;
	else
		jumpKeyPressed = 0;

	return jumpKeyPressed;

}

ncp_jump(0x02155b6c,54) // replaces Trampoline::updateJumpBoostKeys 
static bool noSpringBoostWhenBroke(Trampoline* spring, Player& player, u8 playerID) {
	u16 doJumpBoost;
	if (spring->playerJumpBoost[playerID] == 0) {
		doJumpBoost = player.getJumpKeysPressed();
		if (doJumpBoost != 0) 
			return true;
	} else {
		if (Game::getPlayerCoins(playerID) == 0) return false;
		doJumpBoost = player.getJumpKeysHeld();
		if (doJumpBoost == 0) {
			spring->playerJumpBoost[playerID] = 0;
			return true;
		}

	}
	return false;
}

ncp_hook(0x020fd0f0,10) // on Player::playJumpSFX
static void loseCoinOnJumpSFX(Player* player) {
	if (Game::getPlayerCoins(player->playerID) != 0)
		Game::playerCoins[player->playerID] -= 1;
}

ncp_hook(0x021132c0,10) // on wall jump ?
static void loseCoinOnWallJump(Player* player) {
	if (Game::getPlayerCoins(player->playerID) != 0)
		Game::playerCoins[player->playerID] -= 1;
}

#if COINS_PER_STARCOIN
ncp_hook(0x02006868) // on StarCoin::SetCollected get 5 coins
static void fiveCoinsOnStar() {
	for (int i = 0; i < COINS_PER_STARCOIN; i++) {
		Game::addPlayerCoin(Game::localPlayerID);
	}
}
#endif

ncp_call(0x02183700,90) // no bouncy mushroom tall jump when broke 
static void loseCoinBounceShroom() {
	Player* player = Game::getPlayer(Game::localPlayerID);
	if (Game::getPlayerCoins(player->playerID) != 0) {
		player->doTallJump(0x4c00,0x10,false,true,0);
		Game::playerCoins[Game::localPlayerID] -= 1;
	}
}
