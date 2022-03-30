package dev.qixils.htsea;

import fr.minuskube.inv.SmartInventory;
import fr.minuskube.inv.content.InventoryContents;
import fr.minuskube.inv.content.InventoryProvider;
import org.bukkit.entity.Player;

public interface IInventory extends InventoryProvider {
	SmartInventory getInventory();

	@Override
	default void update(Player player, InventoryContents contents) {
	}
}
