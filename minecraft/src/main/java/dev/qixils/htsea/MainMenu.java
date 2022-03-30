package dev.qixils.htsea;

import fr.minuskube.inv.ClickableItem;
import fr.minuskube.inv.SmartInventory;
import fr.minuskube.inv.content.InventoryContents;
import fr.minuskube.inv.content.InventoryProvider;
import org.bukkit.entity.Player;

public final class MainMenu implements IInventory {
	private final SmartInventory inv = SmartInventory.builder()
			.id("htsea-main-menu")
			.provider(this)
			.size(3, 9)
			.title("HTSea")
			.build();

	public SmartInventory getInventory() {
		return inv;
	}

	@Override
	public void init(Player player, InventoryContents contents) {
		contents.set(1, 4, ClickableItem.of());
	}
}
