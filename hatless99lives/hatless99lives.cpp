#include "nsmb.hpp"

ncp_jump(0x020ddcdc,8) // WorldmapPlayerModel::create
NTR_NAKED static void noCap99LivesWM() {asm(R"(
	ldr 	r6, =0x02088be8
	ldr		r6, [r6]
	cmp 	r6, #99
	orreq 	r3, r3, #0x4
	bicne 	r3, r3, #0x4
	b 		0x020ddcdc + 4
)");}

ncp_jump(0x02117cf8,10) // Player::goalBeginRemoveCap
static void noFlagpoleHatAnim99(Player* player) {
	if (Game::getPlayerLives(player->playerID) == 99 && player->subActionFlag.disableCap) {
		player->setAnimation(0x63,false,Player::FrameMode::Restart,0x1000,0); // do backflip victory anim
	} else {
		player->setAnimation(0x61,false,Player::FrameMode::Restart,0x1000,0);
		player->model.flags &= ~2;	
	}
}

ncp_hook(0x0210012c,10) // Player::reset
static void removeCapOnReset(Player* player) {
	player->subActionFlag.disableCap = Game::getPlayerLives(player->playerID) == 99;
}

static u16 victoryUpdateNoCap(Player* player) {
	if (Game::getPlayerLives(player->playerID) == 99 && player->subActionFlag.disableCap)
		return 0;
	else
		return player->getBodyAnimationFrame();
}
ncp_set_call(0x02117bd0,10,victoryUpdateNoCap) // Player::goalUpdateRemoveCap
ncp_set_call(0x02117c78,10,victoryUpdateNoCap) // Player::goalUpdatePutCap

ncp_jump(0x0212d234,11) // PlayerModel::render
NTR_NAKED static void noSmallNoCapDeadHead() {asm(R"(
	beq 	0x0212d23c
	ldr  	r0, [r10,0x3c1]
	cmp  	r0, #0
	moveq 	r0, #3
	strbeq 	r0, [r10,#0x3c2]
	b 		0x0212d260
)");}
