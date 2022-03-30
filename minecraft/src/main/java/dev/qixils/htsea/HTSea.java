package dev.qixils.htsea;

import cloud.commandframework.ArgumentDescription;
import cloud.commandframework.execution.AsynchronousCommandExecutionCoordinator;
import cloud.commandframework.paper.PaperCommandManager;
import org.bukkit.Bukkit;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.jetbrains.annotations.Nullable;

import java.net.MalformedURLException;
import java.net.URL;

public final class HTSea extends JavaPlugin {

	private final MainMenu menu = new MainMenu();
	private @Nullable String apiSecret;
	private @Nullable URL apiUrl;
	private @Nullable PaperCommandManager<CommandSender> commandManager;

	@Override
	public void onLoad() {
		saveDefaultConfig();

		// command framework
		try {
			commandManager = PaperCommandManager.createNative(
					this,
					AsynchronousCommandExecutionCoordinator.<CommandSender>newBuilder()
							.withAsynchronousParsing()
							.withExecutor(runnable -> Bukkit.getScheduler().runTaskAsynchronously(this, runnable))
							.build()
			);
		} catch (Exception e) {
			throw new IllegalStateException("Failed to create command manager", e);
		}

		try {
			commandManager.registerBrigadier();
			commandManager.registerAsynchronousCompletions();
		} catch (Exception e) {
			getSLF4JLogger().warn("Failed to register parts of the command manager", e);
		}

		// commands
		commandManager.command(
				commandManager.commandBuilder("htsea", ArgumentDescription.of("Opens the HTSea menu for managing your wallet"))
						.senderType(Player.class)
						.handler(ctx -> menu.getInventory().open((Player) ctx.getSender()))
		);
	}

	@SuppressWarnings("HttpUrlsUsage")
	@Override
	public void onEnable() {
		FileConfiguration config = getConfig();
		// parse api secret
		apiSecret = config.getString("api-secret");
		if (apiSecret == null || apiSecret.isEmpty())
			throw new IllegalStateException("API secret is not set. Please set one in the plugin's config.yml");
		// parse api url
		String apiUrl = config.getString("api-url", "htsea.qixils.dev");
		if (apiUrl.isEmpty())
			throw new IllegalStateException("API url is not set. Please set one in the plugin's config.yml");
		else if (apiUrl.startsWith("http://"))
			apiUrl = apiUrl.replace("http://", "https://");
		else if (!apiUrl.startsWith("https://"))
			apiUrl = "https://" + apiUrl;
		if (!apiUrl.endsWith("/"))
			apiUrl += "/";
		try {
			this.apiUrl = new URL(apiUrl);
		} catch (MalformedURLException e) {
			throw new IllegalStateException("Invalid API URL: " + config.getString("api-url"), e);
		}
	}

	@Override
	public void onDisable() {
		// Plugin shutdown logic
	}

	@EventHandler
	public void onJoin(PlayerJoinEvent event) {

	}
}
