package dev.qixils.htsea;

import cloud.commandframework.ArgumentDescription;
import cloud.commandframework.execution.AsynchronousCommandExecutionCoordinator;
import cloud.commandframework.paper.PaperCommandManager;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import dev.qixils.htsea.responses.ProfileResponse;
import dev.qixils.htsea.responses.Response;
import dev.qixils.htsea.responses.SecretResponse;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import net.kyori.adventure.text.minimessage.MiniMessage;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.OfflinePlayer;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityPickupItemEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.jetbrains.annotations.Contract;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;

public final class HTSea extends JavaPlugin implements Listener {

	private static final Component WELCOME = Component.text("Welcome to the ", NamedTextColor.GOLD)
			.append(Component.text("HTSea Minecraft Server", NamedTextColor.AQUA))
			.append(Component.text("! "));
	private static final Component WELCOME_ERROR = WELCOME
			.append(Component.text("We seem to be experiencing some issues right now. " +
					"Some services may not function as expected. " +
					"We apologize for the inconvenience."));
	private static final Gson GSON = new GsonBuilder().serializeNulls().create();
	private final Set<UUID> playersInformed = new HashSet<>();
	private final MiniMessage miniMessage = MiniMessage.miniMessage();
	private @Nullable String apiSecret;
	private @Nullable String apiHost;
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
				commandManager.commandBuilder("vault", ArgumentDescription.of("Opens the vault menu for managing your wallet"))
						.senderType(Player.class)
						.handler(ctx -> new MainMenu(this).open((Player) ctx.getSender()))
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
		apiHost = config.getString("api-url", "htsea.qixils.dev");
		if (apiHost.isEmpty())
			throw new IllegalStateException("API host is not set. Please set one in the plugin's config.yml");
		else if (apiHost.startsWith("http://") || apiHost.startsWith("https://") || apiHost.endsWith("/"))
			throw new IllegalStateException("Expected a (sub)domain for API host but got a URL: " + apiHost);
	}

	@Override
	public void onDisable() {
		// Plugin shutdown logic
	}

	/**
	 * Sends a request to the API.
	 *
	 * @param responseClass the class of the expected response type
	 * @param file          the path to request from the API
	 * @param requestMethod the HTTP method to use
	 * @param allowErrors   whether to return the response even if it has an error
	 * @param connConsumer  a consumer that will be called with the connection to modify it before
	 *                      sending the request
	 * @param <R>           the expected response type
	 * @return              the response from the API, or null if an error occurred
	 */
	@Contract("_, _, _, true, _ -> !null; _, _, _, false, _ -> _")
	public <R extends Response> R request(@NotNull Class<R> responseClass,
										  @NotNull String file,
										  @NotNull String requestMethod,
										  boolean allowErrors,
										  @Nullable Consumer<HttpURLConnection> connConsumer) {
		URL url;
		try {
			url = new URL("https", apiHost, file);
		} catch (MalformedURLException e) {
			throw new IllegalStateException("Failed to create API URL", e);
		}

		try {
			// configure connection
			HttpURLConnection conn = (HttpURLConnection) url.openConnection();
			conn.setRequestMethod(requestMethod);
			conn.setRequestProperty("Authorization", "Bearer " + apiSecret);
			conn.setConnectTimeout(5000);
			conn.setReadTimeout(5000);
			conn.setInstanceFollowRedirects(false);
			if (connConsumer != null)
				connConsumer.accept(conn);

			// get response
			BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
			String inputLine;
			StringBuilder content = new StringBuilder();
			while ((inputLine = in.readLine()) != null)
				content.append(inputLine);
			in.close();
			R response = GSON.fromJson(content.toString(), responseClass);
			int status = conn.getResponseCode();
			response.status = status;

			// handle response
			if (status == HttpURLConnection.HTTP_FORBIDDEN || status == HttpURLConnection.HTTP_UNAUTHORIZED) {
				getSLF4JLogger().error("The provided API secret is invalid. Error code: " + status);
				return allowErrors ? response : null;
			}
			if (!allowErrors && (status != HttpURLConnection.HTTP_OK || response.hasError())) {
				getSLF4JLogger().warn("Failed to get data. Error: " + status + ' ' + response.error);
				return null;
			}
			return response;
		} catch (IOException e) {
			getSLF4JLogger().error("Failed to open connection to API", e);
			if (allowErrors) {
				try {
					R response = responseClass.getDeclaredConstructor().newInstance();
					response.error = e.getMessage();
					response.status = HttpURLConnection.HTTP_INTERNAL_ERROR;
				} catch (Exception ignored) {
				}
			}
			return null;
		}
	}

	/**
	 * Fetches a user's profile from the API.
	 * The profile object may contain {@link ProfileResponse#hasError() an error}.
	 *
	 * @param uuid the UUID of the user
	 * @return     the user's profile
	 */
	@NotNull
	public ProfileResponse getProfile(UUID uuid) {
		return request(ProfileResponse.class,
				"api/users/mc/profile?uuid=" + uuid,
				"GET",
				true,
				null
		);
	}

	/**
	 * Fetches a user's profile from the API.
	 * The profile object may contain {@link ProfileResponse#hasError() an error}.
	 *
	 * @param player the player to fetch the profile for
	 * @return       the user's profile
	 */
	@NotNull
	public ProfileResponse getProfile(OfflinePlayer player) {
		return getProfile(player.getUniqueId());
	}

	@EventHandler
	public void onJoin(PlayerJoinEvent event) {
		Player player = event.getPlayer();
		player.sendPlayerListHeader(miniMessage.deserialize(
				"<color:yellow>You are playing on the <color:gold>HTSea Minecraft Server</color>.</color>\n" +
				"<color:aqua>Use <color:blue>/vault</color> to deposit and withdrawal Diamonds.</color>"));
		Bukkit.getScheduler().runTaskAsynchronously(this, () -> {
			SecretResponse response = request(SecretResponse.class, "api/users/mc/secret", "GET", false, conn -> {
				conn.setDoOutput(true);
				try {
					DataOutputStream out = new DataOutputStream(conn.getOutputStream());
					out.writeBytes("uuid=" + player.getUniqueId());
					out.flush();
					out.close();
				} catch (IOException e) {
					throw new RuntimeException("Failed to set query string", e);
				}
			});
			if (response == null) {
				player.sendMessage(WELCOME_ERROR);
				return;
			}
			if (!response.hasData()) {
				ProfileResponse profile = getProfile(player);
				if (profile.hasError() || !profile.hasData()) {
					player.sendMessage(WELCOME_ERROR);
					return;
				}
				player.sendMessage(WELCOME
						.append(miniMessage.deserialize("You are logged in as <color:yellow>"
								+ profile.getName() + '#' + profile.getDiscriminatorString() + '.')));
				return;
			}
			Component message = WELCOME
					.append(Component.text("To begin your adventure, please visit "))
					.append(Component.text("this page", NamedTextColor.YELLOW, TextDecoration.UNDERLINED)
							.clickEvent(ClickEvent.openUrl("https://htsea.qixils.dev/api/users/connect?uuid=" + player.getUniqueId() + "&secret=" + response.secret)))
					.append(Component.text(" to create your account and start earning Diamonds."));
			player.sendMessage(message);
		});
	}

	// inform players about the /vault command when they pick up a diamond for the first time
	// (and their balance is 0)
	@EventHandler
	public void onPickupDiamond(EntityPickupItemEvent event) {
		if (!(event.getEntity() instanceof Player player))
			return;
		if (playersInformed.contains(player.getUniqueId()))
			return;
		if (event.getItem().getItemStack().getType() != Material.DIAMOND)
			return;
		playersInformed.add(player.getUniqueId());
		if (getProfile(player).getDiamonds() > 0)
			return;
		player.sendMessage(miniMessage.deserialize("<color:green>You have picked up a Diamond! " +
				"You can now use <color:dark_green>/vault</color> to deposit it into your account. " +
				"This will allow you to spend your Diamonds on the <color:aqua>HTSea</color> storefront."));
	}
}
