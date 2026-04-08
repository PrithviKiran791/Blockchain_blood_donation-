const hre = require("hardhat");

async function main() {
  console.log("🩸 Deploying EmergBlood contract...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📋 Deployer (Admin):", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  const EmergBlood = await hre.ethers.getContractFactory("EmergBlood");
  const contract = await EmergBlood.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("═══════════════════════════════════════════════════");
  console.log("✅ EmergBlood deployed successfully!");
  console.log("📍 Contract Address:", address);
  console.log("👑 Admin Address:   ", deployer.address);
  console.log("═══════════════════════════════════════════════════");
  console.log("\n🔗 Copy the contract address above and paste it into the EmergBlood frontend.\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
