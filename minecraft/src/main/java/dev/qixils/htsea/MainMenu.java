package dev.qixils.htsea;

import dev.qixils.htsea.responses.EmptyResponse;
import dev.qixils.htsea.responses.ProfileResponse;
import fr.minuskube.inv.ClickableItem;
import fr.minuskube.inv.SmartInventory;
import fr.minuskube.inv.content.InventoryContents;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.OfflinePlayer;
import org.bukkit.Sound;
import org.bukkit.entity.Player;
import org.bukkit.event.Event.Result;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.inventory.meta.SkullMeta;
import org.bukkit.scheduler.BukkitTask;

import java.io.DataOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

public final class MainMenu implements IInventory {
	private static final Material LOADING_COLOR_1 = Material.LIGHT_BLUE_STAINED_GLASS_PANE;
	private static final Material LOADING_COLOR_2 = Material.PURPLE_STAINED_GLASS_PANE;
	private static final NumberFormat BALANCE_FORMAT = new DecimalFormat("#,###.###");
	private static final int TRANSACTION_ITEM_ROW = 2;
	private final HTSea plugin;
	private final SmartInventory inv;
	private int transactionTally = 0;
	private double diamonds = 0;

	public MainMenu(HTSea plugin) {
		this.plugin = plugin;
		inv = SmartInventory.builder()
				.id("htsea-main-menu")
				.provider(this)
				.size(3, 9)
				.title("HTSea")
				.manager(plugin.getInventoryManager())
				.build();
	}

	public SmartInventory getInventory() {
		return inv;
	}

	public void open(Player player) {
		Bukkit.getScheduler().runTask(plugin, () -> inv.open(player));
	}

	private static ItemStack getLoadingItem(Material mat) {
		ItemStack item = new ItemStack(mat);
		ItemMeta meta = item.getItemMeta();
		meta.displayName(Component.text("Loading...", NamedTextColor.GRAY).decoration(TextDecoration.ITALIC, false));
		item.setItemMeta(meta);
		return item;
	}

	private ItemStack getTransactionTallyItem() {
		ItemStack item = new ItemStack(Material.PAPER);
		ItemMeta meta = item.getItemMeta();
		meta.displayName(Component.text("Transaction", NamedTextColor.BLUE).decoration(TextDecoration.ITALIC, false));
		if (transactionTally == 0)
			meta.lore(Collections.singletonList(Component.text("You do not have a transaction pending.", NamedTextColor.GRAY).decoration(TextDecoration.ITALIC, false)));
		else
			meta.lore(List.of(
					Component.text("You are about to ", NamedTextColor.GRAY).decoration(TextDecoration.ITALIC, false),
					(transactionTally > 0 ? Component.text("deposit ", NamedTextColor.GREEN) : Component.text("withdrawal ", NamedTextColor.RED)).decoration(TextDecoration.ITALIC, false)
							.append(Component.text(BALANCE_FORMAT.format(Math.abs(transactionTally)) + " Diamond" + (Math.abs(transactionTally) == 1 ? "" : "s"), NamedTextColor.AQUA))
							.append(Component.text('.', NamedTextColor.GRAY)),
					Component.text("Click to confirm.", NamedTextColor.GRAY).decoration(TextDecoration.ITALIC, false)
			));
		item.setItemMeta(meta);
		return item;
	}

	private ClickableItem getTransactionModificationItem(Player player, InventoryContents contents, Material mat, int amount) {
		int absAmount = Math.abs(amount);
		ItemStack item = new ItemStack(mat);
		ItemMeta meta = item.getItemMeta();
		meta.displayName(Component.text("Modify Transaction", NamedTextColor.BLUE).decoration(TextDecoration.ITALIC, false));
		meta.lore(List.of(
				Component.text(amount > 0 ? "Increment" : "Decrement", NamedTextColor.GRAY).decoration(TextDecoration.ITALIC, false)
						.append(Component.text(" transaction ")),
				Component.text('(' + (amount > 0 ? "deposit" : "withdrawal") + ") by ", NamedTextColor.GRAY).decoration(TextDecoration.ITALIC, false)
						.append(Component.text(BALANCE_FORMAT.format(absAmount) + " Diamond" + (absAmount == 1 ? "" : "s"), NamedTextColor.AQUA))
						.append(Component.text('.', NamedTextColor.GRAY))
		));
		item.setItemMeta(meta);
		return ClickableItem.of(item, e -> {
			e.setResult(Result.DENY);
			int originalTally = transactionTally;
			transactionTally = Math.max(transactionTally + amount, -1 * (int) Math.floor(diamonds));
			transactionTally = Math.min(transactionTally, player.getInventory().all(Material.DIAMOND).values().stream().mapToInt(ItemStack::getAmount).sum());
			if (transactionTally == originalTally)
				player.playSound(player, Sound.ENTITY_VILLAGER_NO, 1.1F, 1.0F);
			else {
				player.playSound(player, Sound.BLOCK_NOTE_BLOCK_BIT, .6F, amount > 0 ? 1.8F : .4F);
				updateTransactionItems(player, contents);
			}
		});
	}

	private void updateTransactionItems(Player player, InventoryContents contents) {
		contents.set(TRANSACTION_ITEM_ROW, 4, ClickableItem.of(getTransactionTallyItem(), e -> {
			e.setResult(Result.DENY);
			if (!e.isLeftClick() || e.isShiftClick()) return;
			if (transactionTally == 0) return;
			player.closeInventory();
			int diamondsToDeposit = transactionTally;
			for (ItemStack item : player.getInventory().getContents()) {
				if (diamondsToDeposit <= 0) break;
				if (item == null || item.getType() != Material.DIAMOND || item.getAmount() < 0) continue;
				int depositing = Math.min(item.getAmount(), transactionTally);
				diamondsToDeposit -= depositing;
				item.setAmount(item.getAmount() - depositing);
			}
			if (diamondsToDeposit > 0) {
				player.sendMessage(Component.text("You do not have enough diamonds to complete this transaction.", NamedTextColor.RED));
				// refund the transaction
				final int refund = transactionTally - diamondsToDeposit;
				Bukkit.getScheduler().runTask(plugin, () -> player.getWorld().dropItem(player.getLocation(), new ItemStack(Material.DIAMOND, refund)));
				return;
			}
			Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
				EmptyResponse response = plugin.request(
						EmptyResponse.class,
						"api/users/mc/add_diamonds",
						"POST",
						true,
						conn -> {
							try {
								conn.setRequestProperty("Content-Type", "application/json; utf-8");
								conn.setRequestProperty("Accept", "application/json");
								conn.setDoOutput(true);
								OutputStream output = conn.getOutputStream();
								output.write(new AddDiamondsObject(player, transactionTally).toJSON().getBytes(StandardCharsets.UTF_8));
								output.flush();
								output.close();
							} catch (IOException exc) {
								throw new RuntimeException(exc);
							}
						}
				);
				Component message;
				if (response.hasError()) {
					// reimburse the player
					if (transactionTally > 0)
						Bukkit.getScheduler().runTask(plugin, () -> player.getWorld().dropItem(player.getLocation(), new ItemStack(Material.DIAMOND, transactionTally)));
					// show the error
					message = Component.text("An error occurred while attempting to perform this transaction.", NamedTextColor.RED);
					String error = " The error was " + response.status;
					if (response.error != null)
						error += ' ' + response.error;
					message = message.append(Component.text(error, NamedTextColor.GRAY));
				} else
					message = Component.text("Your ", NamedTextColor.GREEN)
							.append(transactionTally > 0 ? Component.text("deposit", NamedTextColor.GREEN) : Component.text("withdrawal", NamedTextColor.RED))
							.append(Component.text(" of "))
							.append(Component.text(BALANCE_FORMAT.format(Math.abs(transactionTally)) + " Diamond" + (Math.abs(transactionTally) == 1 ? "" : "s"), NamedTextColor.AQUA))
							.append(Component.text(" was successful."));
				player.sendMessage(message);
			});
		}));
		// increment/decrement pending transaction items
		contents.set(TRANSACTION_ITEM_ROW, 2, getTransactionModificationItem(player, contents, Material.GREEN_STAINED_GLASS_PANE, 5));
		contents.set(TRANSACTION_ITEM_ROW, 3, getTransactionModificationItem(player, contents, Material.LIME_STAINED_GLASS_PANE, 1));
		contents.set(TRANSACTION_ITEM_ROW, 6, getTransactionModificationItem(player, contents, Material.RED_STAINED_GLASS_PANE, -5));
		contents.set(TRANSACTION_ITEM_ROW, 5, getTransactionModificationItem(player, contents, Material.PINK_STAINED_GLASS_PANE, -1));
	}

	@Override
	public void init(Player player, InventoryContents contents) {
		// loading animation
		AtomicInteger animFrame = new AtomicInteger(0);
		BukkitTask anim = Bukkit.getScheduler().runTaskTimerAsynchronously(plugin, () -> {
			int coloredSquares = animFrame.get() % 8;
			Material base = animFrame.get() < 8 ? LOADING_COLOR_1 : LOADING_COLOR_2;
			Material colored = animFrame.get() < 8 ? LOADING_COLOR_2 : LOADING_COLOR_1;
			for (int row = 0; row < 3; row++) {
				for (int col = 3; col < 6; col++) {
					if (row == 1 && col == 4) continue;
					Material mat = coloredSquares-- > 0 ? colored : base;
					contents.set(row, col, ClickableItem.of(getLoadingItem(mat), e -> e.setResult(Result.DENY)));
				}
			}
			animFrame.set((animFrame.get() + 1) % 17);
		}, 0, 2);

		// actual menu
		Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
			// get profile
			ProfileResponse profile = plugin.getProfile(player);
			// cancel loading animation
			anim.cancel();
			Bukkit.getScheduler().runTaskLater(plugin, () -> {
				contents.fill(ClickableItem.of(new ItemStack(Material.AIR), e -> e.setResult(Result.DENY)));
				// abort if profile is null or has an error
				// TODO better handling of users with no linked account
				if ("The requested profile could not be found.".equals(profile.error)) {
					player.closeInventory();
					player.sendMessage(Component.text("You do not have a linked HTSea account. Please click on the URL sent to you upon joining the server to link one.", NamedTextColor.RED));
					player.playSound(player, Sound.ENTITY_VILLAGER_NO, 1.1F, 1.0F);
				}
				if (profile.hasError()) {
					ItemStack errorItem = new ItemStack(Material.BARRIER);
					ItemMeta meta = errorItem.getItemMeta();
					meta.displayName(Component.text("An error has occurred", NamedTextColor.RED).decoration(TextDecoration.ITALIC, false));
					meta.lore(Collections.singletonList(
							Component.text(profile.status, NamedTextColor.GOLD).decoration(TextDecoration.ITALIC, false)
									.append(Component.space())
									.append(Component.text(Objects.requireNonNullElse(profile.error, "[Error Unknown]"), NamedTextColor.YELLOW))
					));
					contents.set(1, 4, ClickableItem.of(errorItem, e -> e.setResult(Result.DENY)));
					return;
				}
				// player balance item
				diamonds = profile.getDiamonds();
				ItemStack playerHead = new ItemStack(Material.PLAYER_HEAD);
				SkullMeta meta = (SkullMeta) playerHead.getItemMeta();
				meta.setOwningPlayer(player);
				meta.displayName(Component.text("Balance", NamedTextColor.BLUE).decoration(TextDecoration.ITALIC, false));
				meta.lore(Collections.singletonList(Component.text(BALANCE_FORMAT.format(diamonds) + " Diamond" + (Math.abs(diamonds) == 1 ? "" : "s"), NamedTextColor.GOLD).decoration(TextDecoration.ITALIC, false)));
				playerHead.setItemMeta(meta);
				contents.set(0, 4, ClickableItem.empty(playerHead));
				// transaction tally item
				updateTransactionItems(player, contents);
			}, 1L);
		});
	}

	private record AddDiamondsObject(String uuid, int diamonds) {
		public AddDiamondsObject(UUID uuid, int diamonds) {
			this(uuid.toString(), diamonds);
		}

		public AddDiamondsObject(OfflinePlayer player, int diamonds) {
			this(player.getUniqueId(), diamonds);
		}

		public String toJSON() {
			return HTSea.GSON.toJson(this);
		}
	}
}
